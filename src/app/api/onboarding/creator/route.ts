import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/onboarding/creator?token=INVITE_TOKEN
// Returns creator info to pre-fill the form (public)
export async function GET(request: NextRequest) {
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
      workspace: { select: { name: true, brandLogo: true } },
    },
  })

  if (!creator) return NextResponse.json({ error: "Link inválido o expirado" }, { status: 404 })

  return NextResponse.json({ creator })
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

    // Find creator by invite token or by email
    let creator = data.token
      ? await prisma.creator.findUnique({ where: { inviteToken: data.token } })
      : await prisma.creator.findFirst({ where: { email: userEmail } })

    if (!creator) {
      return NextResponse.json({ error: "Creator no encontrado" }, { status: 404 })
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
      update: {},
    })

    // Update creator profile
    const updated = await prisma.creator.update({
      where: { id: creator.id },
      data: {
        userId,
        status: "ACTIVE",
        profileCompleted: true,
        acceptedAt: new Date(),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.instagram !== undefined && { instagram: data.instagram || null }),
        ...(data.tiktok !== undefined && { tiktok: data.tiktok || null }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.province !== undefined && { province: data.province || null }),
        ...(data.niches && { niches: data.niches }),
        ...(data.shippingAddress !== undefined && { shippingAddress: data.shippingAddress || null }),
        ...(data.shippingCity !== undefined && { shippingCity: data.shippingCity || null }),
        ...(data.shippingProvince !== undefined && { shippingProvince: data.shippingProvince || null }),
        ...(data.shippingZipCode !== undefined && { shippingZipCode: data.shippingZipCode || null }),
        ...(data.bankAlias !== undefined && { bankAlias: data.bankAlias || null }),
        ...(data.avatar !== undefined && { avatar: data.avatar || null }),
      },
    })

    // Accept all pending invites for this creator
    await prisma.campaignInvite.updateMany({
      where: { creatorId: creator.id, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    })

    await prisma.campaignCreator.updateMany({
      where: { creatorId: creator.id, status: "INVITED" },
      data: { status: "ACCEPTED" },
    })

    return NextResponse.json({ ok: true, creatorId: updated.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Onboarding] Error:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}
