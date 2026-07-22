import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDateRange } from "@/lib/utils"
import { requireWorkspace } from "@/lib/api/workspace"
import { requireCampaignAccess } from "@/lib/api/campaign-access"
import { handleError } from "@/lib/api/response"

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
  const ws = await requireWorkspace()
  if (ws.error) return ws.error
  const { workspaceId, userId } = ws

  const sp = request.nextUrl.searchParams
  const period = (sp.get("period") ?? "30d") as "7d" | "30d" | "90d"
  const linkId = sp.get("linkId")
  const campaignId = sp.get("campaignId")
  const creatorId = sp.get("creatorId")

  const { from, to } = getDateRange(period)
  const fromDate = new Date(from + "T00:00:00.000Z")
  const toDate = new Date(to + "T23:59:59.999Z")

  try {
    // Resolve which link IDs to filter by
    let targetLinkIds: string[]

    if (linkId) {
      // El link puede vivir en OTRO workspace (campaña compartida como
      // colaborador). Lo buscamos sin scope y validamos el acceso: dueño del
      // workspace, o colaborador ACCEPTED de la campaña a la que pertenece.
      const link = await prisma.link.findUnique({
        where: { id: linkId },
        select: { id: true, workspaceId: true, campaignId: true },
      })
      if (!link) {
        targetLinkIds = []
      } else if (link.workspaceId === workspaceId) {
        targetLinkIds = [link.id]
      } else if (link.campaignId) {
        const access = await requireCampaignAccess(link.campaignId, userId)
        targetLinkIds = access.error ? [] : [link.id]
      } else {
        targetLinkIds = []
      }
    } else if (campaignId) {
      // Owner o colaborador → usar el workspace real de la campaña.
      const access = await requireCampaignAccess(campaignId, userId)
      if (access.error) {
        targetLinkIds = []
      } else {
        const campaignLinks = await prisma.link.findMany({
          where: { campaignId, workspaceId: access.workspaceId },
          select: { id: true },
        })
        targetLinkIds = campaignLinks.map((l) => l.id)
      }
    } else if (creatorId) {
      const creatorLinks = await prisma.link.findMany({
        where: { creatorId, workspaceId },
        select: { id: true },
      })
      targetLinkIds = creatorLinks.map((l) => l.id)
    } else {
      const workspaceLinks = await prisma.link.findMany({
        where: { workspaceId },
        select: { id: true },
      })
      targetLinkIds = workspaceLinks.map((l) => l.id)
    }

    const clicks = targetLinkIds.length
      ? await prisma.click.findMany({
          where: {
            linkId: { in: targetLinkIds },
            timestamp: { gte: fromDate, lte: toDate },
          },
          select: { timestamp: true, ipHash: true, country: true, device: true, source: true },
        })
      : []

    // conversiones por día
    const conversionsRaw = targetLinkIds.length
      ? await prisma.conversion.findMany({
          where: {
            linkId: { in: targetLinkIds },
            convertedAt: { gte: fromDate, lte: toDate },
          },
          select: { convertedAt: true },
        })
      : []

    // clicks por día (+ conversiones por día)
    const days = buildDayRange(from, to)
    const clicksByDay = days.map((date) => {
      const dayClicks = clicks.filter((c) => c.timestamp.toISOString().split("T")[0] === date)
      const uniqueHashes = new Set(dayClicks.map((c) => c.ipHash).filter(Boolean))
      const dayConversions = conversionsRaw.filter(
        (c) => c.convertedAt.toISOString().split("T")[0] === date
      ).length
      return {
        date,
        clicks: dayClicks.length,
        unique_clicks: uniqueHashes.size,
        conversions: dayConversions,
      }
    })

    const uniqueHashes = new Set(clicks.map((c) => c.ipHash).filter(Boolean))
    const stats = { clicks: clicks.length, unique_clicks: uniqueHashes.size }

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
      deviceMap.set(c.device || "desktop", (deviceMap.get(c.device || "desktop") ?? 0) + 1)
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
      sourceMap.set(c.source || "direct", (sourceMap.get(c.source || "direct") ?? 0) + 1)
    })
    const sources = [...sourceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, n]) => ({
        source,
        clicks: n,
        percentage: clicks.length ? Math.round((n / clicks.length) * 100) : 0,
      }))

    // conversiones — siempre por linkId (incluye links sin creator)
    const conversionCount = targetLinkIds.length
      ? await prisma.conversion.count({
          where: {
            linkId: { in: targetLinkIds },
            convertedAt: { gte: fromDate, lte: toDate },
          },
        })
      : 0

    // Filter info for breadcrumb
    const [linkInfo, campaignInfo, creatorInfo] = await Promise.all([
      linkId
        ? prisma.link.findUnique({
            where: { id: linkId },
            select: { slug: true, creator: { select: { name: true } } },
          })
        : null,
      campaignId
        ? prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true } })
        : null,
      creatorId
        ? prisma.creator.findUnique({ where: { id: creatorId }, select: { name: true } })
        : null,
    ])

    return NextResponse.json({
      stats,
      clicksByDay,
      countries,
      devices,
      sources,
      conversions: conversionCount,
      isMock: false,
      filterInfo: {
        linkSlug: linkInfo?.slug ?? null,
        campaignName: campaignInfo?.name ?? null,
        creatorName: creatorInfo?.name ?? null,
      },
    })
  } catch (error) {
    return handleError("[Analytics] GET", error)
  }
}
