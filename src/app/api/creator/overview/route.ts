import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const creator = await prisma.creator.findFirst({ where: { userId } })
    if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [lastCampaignCreator, allLinks, commissions30d, recentEarnings, latestBounty] =
      await Promise.all([
        // Last campaign
        prisma.campaignCreator.findFirst({
          where: { creatorId: creator.id, status: "ACCEPTED" },
          orderBy: { createdAt: "desc" },
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                workspace: { select: { name: true, brandLogo: true, brandColor: true } },
              },
            },
          },
        }),
        // All link IDs
        prisma.link.findMany({
          where: { creatorId: creator.id, archived: false },
          select: { id: true },
        }),
        // 30d commissions
        prisma.commission.findMany({
          where: {
            creatorId: creator.id,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { amount: true, status: true },
        }),
        // Recent earnings (last 5)
        prisma.commission.findMany({
          where: { creatorId: creator.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            conversion: {
              select: {
                orderAmount: true,
                link: { select: { slug: true, campaignId: true } },
              },
            },
          },
        }),
        // Latest bounty
        prisma.bounty.findFirst({
          where: {
            campaignId: {
              in: (
                await prisma.campaignCreator.findMany({
                  where: { creatorId: creator.id, status: "ACCEPTED" },
                  select: { campaignId: true },
                })
              ).map((cc) => cc.campaignId),
            },
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
          include: {
            tiers: { orderBy: { threshold: "asc" } },
            achievements: { where: { creatorId: creator.id } },
            campaign: { select: { id: true, name: true } },
          },
        }),
      ])

    const linkIds = allLinks.map((l) => l.id)
    const clicks30d = linkIds.length
      ? await prisma.click.count({
          where: { linkId: { in: linkIds }, timestamp: { gte: thirtyDaysAgo } },
        })
      : 0

    const conversions30d = await prisma.conversion.count({
      where: { creatorId: creator.id, convertedAt: { gte: thirtyDaysAgo } },
    })

    const earned30d = commissions30d.reduce((s, c) => s + c.amount, 0)

    return NextResponse.json({
      lastCampaign: lastCampaignCreator
        ? {
            campaignId: lastCampaignCreator.campaignId,
            campaignName: lastCampaignCreator.campaign.name,
            brandName: lastCampaignCreator.campaign.workspace.name,
            brandLogo: lastCampaignCreator.campaign.workspace.brandLogo,
            brandColor: lastCampaignCreator.campaign.workspace.brandColor,
          }
        : null,
      stats: { clicks: clicks30d, conversions: conversions30d, earned: earned30d },
      recentEarnings,
      latestBounty,
    })
  } catch (error) {
    return handleError("[Creator/overview] GET", error)
  }
}
