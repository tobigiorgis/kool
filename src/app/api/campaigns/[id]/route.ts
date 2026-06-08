import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      creators: {
        include: {
          creator: {
            select: { id: true, name: true, email: true, instagram: true, discountCode: true, commissionPct: true, status: true },
          },
        },
      },
      links: {
        where: { archived: false },
        include: {
          creator: { select: { name: true } },
        },
      },
      briefings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          sentAt: true,
          createdAt: true,
          assets: true,
          _count: { select: { recipients: true } },
        },
      },
      _count: { select: { applications: true } },
      questions: { orderBy: { order: "asc" } },
    },
  })

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Verify workspace access
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  // Compute analytics: clicks, conversions, revenue, commissions
  const linkIds = campaign.links.map((l) => l.id)
  const creatorIds = campaign.creators.map((cc) => cc.creatorId)

  const [clickCount, conversions, commissions, linkClickCounts, linkConversionData] = await Promise.all([
    linkIds.length
      ? prisma.click.count({ where: { linkId: { in: linkIds } } })
      : 0,
    creatorIds.length
      ? prisma.conversion.findMany({
          where: { creatorId: { in: creatorIds }, linkId: { in: linkIds.length ? linkIds : undefined } },
          select: { orderAmount: true },
        })
      : [],
    creatorIds.length
      ? prisma.commission.aggregate({
          where: { creatorId: { in: creatorIds } },
          _sum: { amount: true },
        })
      : { _sum: { amount: null } },
    // Per-link click counts
    linkIds.length
      ? prisma.click.groupBy({
          by: ["linkId"],
          where: { linkId: { in: linkIds } },
          _count: { id: true },
        })
      : [],
    // Per-link conversions
    linkIds.length
      ? prisma.conversion.findMany({
          where: { linkId: { in: linkIds } },
          select: { linkId: true, orderAmount: true },
        })
      : [],
  ])

  // Build per-link lookup maps
  const clicksByLink = new Map(
    (linkClickCounts as { linkId: string; _count: { id: number } }[]).map((c) => [c.linkId, c._count.id])
  )
  const salesByLink = new Map<string, { sales: number; revenue: number }>()
  for (const conv of linkConversionData as { linkId: string | null; orderAmount: number }[]) {
    if (!conv.linkId) continue
    const prev = salesByLink.get(conv.linkId) ?? { sales: 0, revenue: 0 }
    salesByLink.set(conv.linkId, { sales: prev.sales + 1, revenue: prev.revenue + conv.orderAmount })
  }

  const linksWithMetrics = campaign.links.map((l) => ({
    ...l,
    clicks: clicksByLink.get(l.id) ?? 0,
    sales: salesByLink.get(l.id)?.sales ?? 0,
    revenue: salesByLink.get(l.id)?.revenue ?? 0,
  }))

  const totalRevenue = (conversions as { orderAmount: number }[]).reduce((s, c) => s + c.orderAmount, 0)
  const totalConversions = (conversions as { orderAmount: number }[]).length
  const totalCommissions = commissions._sum.amount ?? 0

  return NextResponse.json({
    campaign: { ...campaign, links: linksWithMetrics },
    analytics: {
      clicks: clickCount,
      conversions: totalConversions,
      revenue: totalRevenue,
      commissions: totalCommissions,
    },
  })
}

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["PRE_LAUNCH", "RUNNING", "COMPLETED"]).optional(),
  budget: z.number().nullable().optional(),
  giftingEnabled:     z.boolean().optional(),
  giftingDescription: z.string().nullable().optional(),
  commissionEnabled:  z.boolean().optional(),
  commissionMaxPct:   z.number().min(1).max(100).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const body = await request.json()
    const data = UpdateCampaignSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
      },
    })

    return NextResponse.json({ ok: true, campaign: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    console.error("[Campaign] Update error:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}
