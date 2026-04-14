import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createTiendanubeCoupon } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { generateDiscountCode, slugify } from "@/lib/utils"
import { z } from "zod"

const CreateLinkSchema = z.object({
  workspaceId: z.string(),
  destination: z.string().url(),
  slug: z.string().min(1).max(50).optional(),
  creatorId: z.string().optional(),
  discountCode: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  title: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const data = CreateLinkSchema.parse(body)

    // Generar slug si no se proveyó
    const slug = data.slug || slugify(data.title || data.destination.replace(/https?:\/\//, "").split("/")[0])

    // Verificar que el slug no esté tomado
    const existing = await prisma.link.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Este slug ya está en uso" }, { status: 409 })
    }

    // Si hay un creator, usar su código de descuento
    let discountCode = data.discountCode
    let utmCampaign = data.utmCampaign

    if (data.creatorId && !discountCode) {
      const creator = await prisma.creator.findUnique({ where: { id: data.creatorId } })
      if (creator?.discountCode) {
        discountCode = creator.discountCode
        utmCampaign = utmCampaign || creator.discountCode
      }
    }

    // Crear el link
    const link = await prisma.link.create({
      data: {
        workspaceId: data.workspaceId,
        creatorId: data.creatorId,
        slug,
        destination: data.destination,
        title: data.title,
        discountCode,
        utmSource: data.utmSource || "kool",
        utmMedium: data.utmMedium || "affiliate",
        utmCampaign,
      },
    })

    return NextResponse.json({ ok: true, link })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Links] Create error:", error)
    return NextResponse.json({ error: "Error al crear el link" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  const creatorId = request.nextUrl.searchParams.get("creatorId")

  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const links = await prisma.link.findMany({
    where: {
      workspaceId,
      ...(creatorId ? { creatorId } : {}),
      archived: false,
    },
    include: { creator: { select: { id: true, name: true, discountCode: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ links })
}
