import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { fail, unauthorized, notFound, handleError } from "@/lib/api/response"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id: campaignId } = await params
  const period = request.nextUrl.searchParams.get("period") || "7d"

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { workspaceId: true },
    })
    if (!campaign) return notFound()

    // Permitir acceso a workspace members Y a creators del programa
    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) {
      const creator = await prisma.creator.findFirst({ where: { userId } })
      const creatorAccess = creator
        ? await prisma.campaignCreator.findFirst({
            where: { creatorId: creator.id, campaignId, status: "ACCEPTED" },
          })
        : null
      if (!creatorAccess) return fail("No access", 403)
    }

    const days = period === "1d" ? 1 : period === "7d" ? 7 : 30

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get link IDs for this campaign
    const links = await prisma.link.findMany({
      where: { campaignId },
      select: { id: true },
    })
    const linkIds = links.map((l) => l.id)

    if (linkIds.length === 0) {
      const emptyData = buildEmptyChart(period, days, startDate)
      return NextResponse.json({ chartData: emptyData })
    }

    // Fetch clicks and conversions
    const [clicks, conversions] = await Promise.all([
      prisma.click.findMany({
        where: { linkId: { in: linkIds }, timestamp: { gte: startDate } },
        select: { timestamp: true },
        orderBy: { timestamp: "asc" },
      }),
      prisma.conversion.findMany({
        where: { linkId: { in: linkIds }, convertedAt: { gte: startDate } },
        select: { convertedAt: true },
        orderBy: { convertedAt: "asc" },
      }),
    ])

    const chartData: { date: string; clicks: number; sales: number }[] = []

    if (period === "1d") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      for (let h = 0; h < 24; h++) {
        const hourStart = new Date(today)
        hourStart.setHours(h, 0, 0, 0)
        const hourEnd = new Date(today)
        hourEnd.setHours(h + 1, 0, 0, 0)

        chartData.push({
          date: hourStart.toISOString(),
          clicks: clicks.filter((c) => c.timestamp >= hourStart && c.timestamp < hourEnd).length,
          sales: conversions.filter((c) => c.convertedAt >= hourStart && c.convertedAt < hourEnd)
            .length,
        })
      }
    } else {
      for (let d = 0; d < days; d++) {
        const dayStart = new Date(startDate)
        dayStart.setDate(startDate.getDate() + d)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)

        chartData.push({
          date: dayStart.toISOString(),
          clicks: clicks.filter((c) => c.timestamp >= dayStart && c.timestamp < dayEnd).length,
          sales: conversions.filter((c) => c.convertedAt >= dayStart && c.convertedAt < dayEnd)
            .length,
        })
      }
    }

    return NextResponse.json({ chartData })
  } catch (error) {
    return handleError("[Campaigns analytics chart] GET", error)
  }
}

function buildEmptyChart(period: string, days: number, startDate: Date) {
  const data = []
  if (period === "1d") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let h = 0; h < 24; h++) {
      const d = new Date(today)
      d.setHours(h, 0, 0, 0)
      data.push({ date: d.toISOString(), clicks: 0, sales: 0 })
    }
  } else {
    for (let d = 0; d < days; d++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + d)
      data.push({ date: day.toISOString(), clicks: 0, sales: 0 })
    }
  }
  return data
}
