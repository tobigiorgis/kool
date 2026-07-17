import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"
import { buildShortUrl } from "@/lib/links"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const creator = await prisma.creator.findFirst({ where: { userId } })
    if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const links = await prisma.link.findMany({
      where: { creatorId: creator.id, archived: false },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            workspace: { select: { name: true, brandLogo: true, brandColor: true } },
          },
        },
        _count: { select: { clicks: true, conversions: true } },
      },
    })

    return NextResponse.json({
      links: links.map((l) => ({
        id: l.id,
        slug: l.slug,
        shortUrl: buildShortUrl(l.slug),
        destination: l.destination,
        discountCode: l.discountCode,
        createdAt: l.createdAt,
        clicks: l._count.clicks,
        conversions: l._count.conversions,
        campaign: l.campaign
          ? {
              id: l.campaign.id,
              name: l.campaign.name,
              brandName: l.campaign.workspace.name,
              brandLogo: l.campaign.workspace.brandLogo,
              brandColor: l.campaign.workspace.brandColor,
            }
          : null,
      })),
    })
  } catch (error) {
    return handleError("[Creator/links] GET", error)
  }
}
