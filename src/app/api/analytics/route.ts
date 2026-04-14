import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import {
  getWorkspaceStats,
  getWorkspaceClicksByDay,
  getLinkStats,
  getLinkClicksByDay,
} from "@/lib/tinybird"
import { getDateRange } from "@/lib/utils"

function generateMockClicksByDay(days: number) {
  const result = []
  const base = 30 + Math.floor(Math.random() * 20)
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const clicks = Math.max(0, base + Math.floor(Math.sin(i) * 15) + Math.floor(Math.random() * 20))
    result.push({
      date: date.toISOString().split("T")[0],
      clicks,
      unique_clicks: Math.floor(clicks * 0.72),
    })
  }
  return result
}

const MOCK_COUNTRIES = [
  { country: "AR", clicks: 412 },
  { country: "MX", clicks: 98 },
  { country: "CL", clicks: 67 },
  { country: "CO", clicks: 45 },
  { country: "PE", clicks: 28 },
  { country: "UY", clicks: 19 },
]

const MOCK_DEVICES = [
  { device: "mobile", clicks: 481, percentage: 70 },
  { device: "desktop", clicks: 138, percentage: 20 },
  { device: "tablet", clicks: 69, percentage: 10 },
]

const MOCK_SOURCES = [
  { source: "instagram", clicks: 310, percentage: 45 },
  { source: "tiktok", clicks: 138, percentage: 20 },
  { source: "direct", clicks: 110, percentage: 16 },
  { source: "whatsapp", clicks: 76, percentage: 11 },
  { source: "other", clicks: 54, percentage: 8 },
]

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const period = (request.nextUrl.searchParams.get("period") ?? "30d") as "7d" | "30d" | "90d"
  const linkId = request.nextUrl.searchParams.get("linkId")

  // Get workspace
  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })
  if (!member) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { from, to } = getDateRange(period)
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
  const hasTinybird = !!process.env.TINYBIRD_API_KEY

  try {
    let stats = { clicks: 0, unique_clicks: 0 }
    let clicksByDay: { date: string; clicks: number; unique_clicks: number }[] = []

    if (hasTinybird) {
      if (linkId) {
        ;[stats, clicksByDay] = await Promise.all([
          getLinkStats(linkId, from, to).catch(() => ({ clicks: 0, unique_clicks: 0 })),
          getLinkClicksByDay(linkId, from, to).catch(() => []),
        ])
      } else {
        ;[stats, clicksByDay] = await Promise.all([
          getWorkspaceStats(member.workspaceId, from, to).catch(() => ({ clicks: 0, unique_clicks: 0 })),
          getWorkspaceClicksByDay(member.workspaceId, from, to).catch(() => []),
        ])
      }
    } else {
      // Mock data fallback
      clicksByDay = generateMockClicksByDay(days)
      stats = {
        clicks: clicksByDay.reduce((s, d) => s + d.clicks, 0),
        unique_clicks: clicksByDay.reduce((s, d) => s + d.unique_clicks, 0),
      }
    }

    // Conversions from DB (always real)
    const conversionCount = await prisma.conversion.count({
      where: {
        link: { workspaceId: member.workspaceId },
        convertedAt: { gte: new Date(from), lte: new Date(to) },
      },
    })

    return NextResponse.json({
      stats,
      clicksByDay,
      countries: hasTinybird ? [] : MOCK_COUNTRIES,
      devices: hasTinybird ? [] : MOCK_DEVICES,
      sources: hasTinybird ? [] : MOCK_SOURCES,
      conversions: conversionCount,
      isMock: !hasTinybird,
    })
  } catch (err) {
    console.error("[Analytics] Error:", err)
    const clicksByDay = generateMockClicksByDay(days)
    return NextResponse.json({
      stats: {
        clicks: clicksByDay.reduce((s, d) => s + d.clicks, 0),
        unique_clicks: clicksByDay.reduce((s, d) => s + d.unique_clicks, 0),
      },
      clicksByDay,
      countries: MOCK_COUNTRIES,
      devices: MOCK_DEVICES,
      sources: MOCK_SOURCES,
      conversions: 0,
      isMock: true,
    })
  }
}
