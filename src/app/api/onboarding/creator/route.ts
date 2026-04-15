import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET /api/onboarding/creator?token=CREATOR_ID
// Devuelve info del creator para pre-llenar el form (público)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const creator = await prisma.creator.findUnique({
    where: { id: token },
    select: {
      id: true,
      name: true,
      email: true,
      instagram: true,
      tiktok: true,
      niche: true,
      audienceSize: true,
      discountCode: true,
      commissionPct: true,
      status: true,
      workspace: { select: { name: true } },
    },
  })

  if (!creator) return NextResponse.json({ error: "Link inválido o expirado" }, { status: 404 })

  return NextResponse.json({ creator })
}

const UpdateCreatorSchema = z.object({
  token: z.string(),
  name: z.string().min(1),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  niche: z.string().optional(),
  audienceSize: z.coerce.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zipCode: z.string().optional(),
})

// POST /api/onboarding/creator
// Actualiza el perfil del creator y lo activa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = UpdateCreatorSchema.parse(body)

    const creator = await prisma.creator.findUnique({ where: { id: data.token } })
    if (!creator) return NextResponse.json({ error: "Token inválido" }, { status: 404 })

    // Si hay sesión de Clerk, linkeamos el userId al creator
    const { userId } = await auth()
    let clerkUserId = userId

    if (clerkUserId && !creator.userId) {
      // Upsert del User en nuestra DB
      const clerkUser = await currentUser()
      await prisma.user.upsert({
        where: { id: clerkUserId },
        create: {
          id: clerkUserId,
          email: clerkUser?.emailAddresses[0]?.emailAddress ?? creator.email,
          name: data.name,
          avatar: clerkUser?.imageUrl ?? undefined,
          role: "CREATOR",
        },
        update: {},
      })
    }

    const updated = await prisma.creator.update({
      where: { id: data.token },
      data: {
        name: data.name,
        phone: data.phone || undefined,
        instagram: data.instagram || undefined,
        tiktok: data.tiktok || undefined,
        niche: data.niche || undefined,
        audienceSize: data.audienceSize || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        zipCode: data.zipCode || undefined,
        status: "ACTIVE",
        ...(clerkUserId && !creator.userId ? { userId: clerkUserId } : {}),
      },
    })

    return NextResponse.json({ ok: true, creator: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    console.error("[Onboarding Creator] Error:", error)
    return NextResponse.json({ error: "Error al guardar el perfil" }, { status: 500 })
  }
}
