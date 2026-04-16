import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendCreatorInvite } from "@/lib/email"
import { z } from "zod"

const InviteCreatorSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
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
        email: data.email,
        instagram: data.instagram,
        commissionPct: data.commissionPct,
        tier: data.tier,
        status: "PENDING",
      },
    })

    // Enviar email de invitación
    const workspace = await prisma.workspace.findUnique({ where: { id: data.workspaceId } })
    const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/creator?token=${creator.id}`

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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Creator] Invite error:", error)
    return NextResponse.json({ error: "Error al invitar creator" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const creators = await prisma.creator.findMany({
    where: { workspaceId },
    include: {
      links: { where: { archived: false }, select: { id: true, slug: true } },
      _count: { select: { conversions: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ creators })
}
