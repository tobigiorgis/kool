import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { workspaceId } = await params

  const creator = await prisma.creator.findFirst({
    where: { workspaceId, userId },
    include: {
      links: {
        where: { archived: false },
        include: { _count: { select: { clicks: true } } },
      },
    },
  })
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Total clicks
  const totalClicks = creator.links.reduce((sum, l) => sum + l._count.clicks, 0)

  // Sales + revenue from commissions
  const commissionsAgg = await prisma.commission.aggregate({
    where: { creatorId: creator.id },
    _count: { id: true },
    _sum: { orderAmount: true },
  })

  // Per-link breakdown
  const linkIds = creator.links.map((l) => l.id)

  const conversionsByLink = linkIds.length
    ? await prisma.conversion.groupBy({
        by: ["linkId"],
        where: { linkId: { in: linkIds } },
        _count: { id: true },
        _sum: { orderAmount: true },
      })
    : []

  const linkStats = creator.links.map((l) => {
    const conv = conversionsByLink.find((c) => c.linkId === l.id)
    return {
      id: l.id,
      slug: l.slug,
      destination: l.destination,
      clickCount: l._count.clicks,
      saleCount: conv?._count.id ?? 0,
      revenue: conv?._sum.orderAmount ?? 0,
    }
  })

  return NextResponse.json({
    clicks: totalClicks,
    sales: commissionsAgg._count.id,
    revenue: commissionsAgg._sum.orderAmount ?? 0,
    links: linkStats,
  })
}
