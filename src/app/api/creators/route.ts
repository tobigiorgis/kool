import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendCreatorInvite } from "@/lib/email"
import { handleError } from "@/lib/api/response"
import { env } from "@/lib/env"
import { z } from "zod"

const InviteCreatorSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  instagram: z.string().optional(),
  commissionPct: z.number().min(1).max(50).default(10),
  tier: z.enum(["BRONZE", "SILVER", "GOLD"]).default("BRONZE"),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const data = InviteCreatorSchema.parse(body)

    // Verificar que no existe ya en este workspace
    const existing = await prisma.creator.findUnique({
      where: { workspaceId_email: { workspaceId: data.workspaceId, email: data.email } },
    })
    if (existing) {
      return NextResponse.json({ error: "Este creator ya existe en tu programa" }, { status: 409 })
    }

    // Crear el creator (sin código de descuento — se asigna por campaña)
    const creator = await prisma.creator.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        instagram: data.instagram,
        commissionPct: data.commissionPct,
        tier: data.tier,
        status: "PENDING",
      },
    })

    // Enviar email de invitación
    const workspace = await prisma.workspace.findUnique({ where: { id: data.workspaceId } })
    const onboardingUrl = `${env.NEXT_PUBLIC_APP_URL}/onboarding/creator?token=${creator.id}`

    await sendCreatorInvite({
      to: data.email,
      creatorName: data.name,
      brandName: workspace?.name || "Kool",
      discountCode: "",
      commissionPct: data.commissionPct,
      onboardingUrl,
    })

    return NextResponse.json({ ok: true, creator })
  } catch (error) {
    return handleError("[Creators] POST", error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspaceId = request.nextUrl.searchParams.get("workspaceId")
    if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

    const creators = await prisma.creator.findMany({
      where: { workspaceId },
      include: {
        links: {
          where: { archived: false },
          select: {
            id: true,
            slug: true,
            destination: true,
            conversions: { select: { orderAmount: true } },
          },
        },
        commissions: {
          select: {
            id: true,
            amount: true,
            orderAmount: true,
            percentage: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        conversions: {
          select: { orderAmount: true },
        },
        campaigns: {
          include: {
            campaign: { select: { id: true, name: true, formStatus: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const enriched = creators.map((c) => {
      const totalSales = c.conversions.length
      const totalRevenue = c.conversions.reduce((s, cv) => s + cv.orderAmount, 0)
      const totalCommissions = c.commissions.reduce((s, cm) => s + cm.amount, 0)
      const pendingCommissions = c.commissions
        .filter((cm) => cm.status === "PENDING")
        .reduce((s, cm) => s + cm.amount, 0)
      const approvedCommissions = c.commissions
        .filter((cm) => cm.status === "APPROVED")
        .reduce((s, cm) => s + cm.amount, 0)
      const paidCommissions = c.commissions
        .filter((cm) => cm.status === "PAID")
        .reduce((s, cm) => s + cm.amount, 0)

      const links = c.links.map((l) => ({
        id: l.id,
        slug: l.slug,
        destination: l.destination,
        sales: l.conversions.length,
        revenue: l.conversions.reduce((s, cv) => s + cv.orderAmount, 0),
      }))

      return {
        ...c,
        links,
        totalClicks: 0, // Tinybird — not available here yet
        totalSales,
        totalRevenue,
        totalCommissions,
        pendingCommissions,
        approvedCommissions,
        paidCommissions,
      }
    })

    return NextResponse.json({ creators: enriched })
  } catch (error) {
    return handleError("[Creators] GET", error)
  }
}
