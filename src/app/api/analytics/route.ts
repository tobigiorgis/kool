import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getDateRange } from "@/lib/utils"

function buildDayRange(from: string, to: string): string[] {
  const days: string[] = []
  const current = new Date(from)
  const end = new Date(to)
  while (current <= end) {
    days.push(current.toISOString().split("T")[0])
    current.setDate(current.getDate() + 1)
  }
  return days
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const period = (request.nextUrl.searchParams.get("period") ?? "30d") as "7d" | "30d" | "90d"
  const linkId = request.nextUrl.searchParams.get("linkId")

  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })
  if (!member) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { from, to } = getDateRange(period)
  const fromDate = new Date(from + "T00:00:00.000Z")
  const toDate = new Date(to + "T23:59:59.999Z")

  try {
    // Traer IDs de links del workspace (evita filtros de relación anidada)
    const workspaceLinks = await prisma.link.findMany({
      where: linkId
        ? { id: linkId, workspaceId: member.workspaceId }
        : { workspaceId: member.workspaceId },
      select: { id: true },
    })
    const linkIds = workspaceLinks.map((l) => l.id)

    const clicks = linkIds.length
      ? await prisma.click.findMany({
          where: {
            linkId: { in: linkIds },
            timestamp: { gte: fromDate, lte: toDate },
          },
          select: {
            timestamp: true,
            ipHash: true,
            country: true,
            device: true,
            source: true,
          },
        })
      : []

    // clicks por día (rellena días sin clics con 0)
    const days = buildDayRange(from, to)
    const clicksByDay = days.map((date) => {
      const dayClicks = clicks.filter(
        (c) => c.timestamp.toISOString().split("T")[0] === date
      )
      const uniqueHashes = new Set(dayClicks.map((c) => c.ipHash).filter(Boolean))
      return { date, clicks: dayClicks.length, unique_clicks: uniqueHashes.size }
    })

    // totales
    const uniqueHashes = new Set(clicks.map((c) => c.ipHash).filter(Boolean))
    const stats = {
      clicks: clicks.length,
      unique_clicks: uniqueHashes.size,
    }

    // países
    const countryMap = new Map<string, number>()
    clicks.forEach((c) => {
      if (c.country) countryMap.set(c.country, (countryMap.get(c.country) ?? 0) + 1)
    })
    const countries = [...countryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, n]) => ({ country, clicks: n }))

    // dispositivos
    const deviceMap = new Map<string, number>()
    clicks.forEach((c) => {
      const d = c.device || "desktop"
      deviceMap.set(d, (deviceMap.get(d) ?? 0) + 1)
    })
    const devices = [...deviceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([device, n]) => ({
        device,
        clicks: n,
        percentage: clicks.length ? Math.round((n / clicks.length) * 100) : 0,
      }))

    // fuentes
    const sourceMap = new Map<string, number>()
    clicks.forEach((c) => {
      const s = c.source || "direct"
      sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1)
    })
    const sources = [...sourceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, n]) => ({
        source,
        clicks: n,
        percentage: clicks.length ? Math.round((n / clicks.length) * 100) : 0,
      }))

    // conversiones
    const conversionCount = await prisma.conversion.count({
      where: {
        creatorId: { in: await prisma.creator.findMany({
          where: { workspaceId: member.workspaceId },
          select: { id: true },
        }).then((cs) => cs.map((c) => c.id)) },
        convertedAt: { gte: fromDate, lte: toDate },
      },
    })

    return NextResponse.json({
      stats,
      clicksByDay,
      countries,
      devices,
      sources,
      conversions: conversionCount,
      isMock: false,
    })
  } catch (err) {
    console.error("[Analytics] Error:", err)
    return NextResponse.json({ error: "Error al obtener analytics" }, { status: 500 })
  }
}
