import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendWelcomeCreator } from "@/lib/email"
import { handleError } from "@/lib/api/response"
import { env } from "@/lib/env"
import { z } from "zod"

// GET /api/onboarding/creator?token=INVITE_TOKEN
// Returns creator info to pre-fill the form (public)
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

    const creator = await prisma.creator.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        instagram: true,
        tiktok: true,
        discountCode: true,
        commissionPct: true,
        status: true,
        profileCompleted: true,
        workspace: { select: { name: true, brandLogo: true } },
      },
    })

    if (!creator) return NextResponse.json({ error: "Link inválido o expirado" }, { status: 404 })

    return NextResponse.json({ creator })
  } catch (error) {
    return handleError("[Onboarding] GET", error)
  }
}

const OnboardingSchema = z.object({
  token: z.string().optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  dateOfBirth: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  niches: z.array(z.string()).max(3).optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingProvince: z.string().optional(),
  shippingZipCode: z.string().optional(),
  bankAlias: z.string().optional(),
  avatar: z.string().optional(),
})

// POST /api/onboarding/creator
// Saves profile and activates creator
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userEmail = clerkUser.emailAddresses[0]?.emailAddress
  if (!userEmail) return NextResponse.json({ error: "No email" }, { status: 400 })

  try {
    const body = await request.json()
    const data = OnboardingSchema.parse(body)

    // Buscar creator:
    // 1. Por token de invite (si viene con link)
    // 2. Por userId ya vinculado (re-activación / idempotencia)
    // 3. Por email como fallback (self-serve)
    //
    // El orden importa: si hay múltiples registros para el mismo email
    // (creator añadido a varios workspaces), debemos encontrar el que ya
    // tiene este userId asignado; de lo contrario el update falla por @unique.
    const creator = data.token
      ? await prisma.creator.findUnique({ where: { inviteToken: data.token } })
      : (await prisma.creator.findFirst({ where: { userId } })) ??
        (await prisma.creator.findFirst({ where: { email: userEmail } }))

    // Token presente pero inválido → link roto. (Sin token y sin match → self-serve: se crea abajo.)
    if (!creator && data.token) {
      return NextResponse.json({ error: "Creator no encontrado" }, { status: 404 })
    }

    // Si el token apunta a un creator ya vinculado a OTRO usuario, rechazar.
    if (creator?.userId && creator.userId !== userId) {
      return NextResponse.json({ error: "Este link ya fue activado por otro usuario." }, { status: 409 })
    }

    // Ensure user record exists
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: userEmail,
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
          : null,
        role: "CREATOR",
      },
      update: { role: "CREATOR" },
    })

    // Campos de perfil comunes al alta (create) y a la activación (update).
    const profileData = {
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.instagram !== undefined && { instagram: data.instagram || null }),
      ...(data.tiktok !== undefined && { tiktok: data.tiktok || null }),
      ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.province !== undefined && { province: data.province || null }),
      ...(data.niches && { niches: data.niches }),
      ...(data.shippingAddress !== undefined && { shippingAddress: data.shippingAddress || null }),
      ...(data.shippingCity !== undefined && { shippingCity: data.shippingCity || null }),
      ...(data.shippingProvince !== undefined && {
        shippingProvince: data.shippingProvince || null,
      }),
      ...(data.shippingZipCode !== undefined && { shippingZipCode: data.shippingZipCode || null }),
      ...(data.bankAlias !== undefined && { bankAlias: data.bankAlias || null }),
      ...(data.avatar !== undefined && { avatar: data.avatar || null }),
    }

    const fullName = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
      : userEmail

    // creator existente (invitado por una marca) → activar y linkear userId.
    // creator inexistente (self-serve, sin marca) → crear con workspaceId null.
    const updated = creator
      ? await prisma.creator.update({
          where: { id: creator.id },
          include: { workspace: { select: { name: true } } },
          data: {
            userId,
            status: "ACTIVE",
            profileCompleted: true,
            acceptedAt: new Date(),
            ...profileData,
          },
        })
      : await prisma.creator.create({
          include: { workspace: { select: { name: true } } },
          data: {
            userId,
            email: userEmail,
            name: fullName,
            firstName: clerkUser.firstName ?? null,
            lastName: clerkUser.lastName ?? null,
            status: "ACTIVE",
            profileCompleted: true,
            acceptedAt: new Date(),
            ...profileData,
          },
        })

    // Aceptar invites pendientes — solo aplica a creators ya existentes (no-op en self-serve).
    if (creator) {
      await prisma.campaignInvite.updateMany({
        where: { creatorId: creator.id, status: "PENDING" },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      })

      await prisma.campaignCreator.updateMany({
        where: { creatorId: creator.id, status: "INVITED" },
        data: { status: "ACCEPTED" },
      })
    }

    // Email de bienvenida (fire-and-forget — no bloquea la respuesta)
    if (updated.email) {
      void sendWelcomeCreator({
        to: updated.email,
        creatorName: updated.firstName || updated.name || "creator",
        brandName: updated.workspace?.name || "tu marca",
        discountCode: updated.discountCode || undefined,
        commissionPct: updated.commissionPct ?? undefined,
        dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/creator`,
      })
    }

    return NextResponse.json({ ok: true, creatorId: updated.id })
  } catch (error) {
    // Unique constraint en userId: el creator ya fue activado con esta cuenta
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Esta cuenta ya tiene un perfil activo. Iniciá sesión normalmente." },
        { status: 409 }
      )
    }
    return handleError("[Onboarding] POST", error)
  }
}
