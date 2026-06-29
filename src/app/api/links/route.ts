import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createTiendanubeCoupon } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { generateDiscountCode, slugify } from "@/lib/utils"
import { handleError } from "@/lib/api/response"
import { z } from "zod"

const CreateLinkSchema = z.object({
  workspaceId: z.string(),
  destination: z.string().url(),
  slug: z.string().min(1).max(50).optional(),
  creatorId: z.string().optional(),
  campaignId: z.string().optional(),
  discountCode: z.string().optional(),
  discountType: z.enum(["percentage", "absolute"]).optional(),
  discountValue: z.number().optional(),
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
    const slug =
      data.slug || slugify(data.title || data.destination.replace(/https?:\/\//, "").split("/")[0])

    // Verificar que el slug no esté tomado
    const existing = await prisma.link.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Este slug ya está en uso" }, { status: 409 })
    }

    // Si hay un creator, usar su código de descuento
    let discountCode = data.discountCode
    let utmCampaign = data.utmCampaign

    if (data.creatorId && !discountCode) {
      // El código vive en CampaignCreator (por campaña). Buscarlo ahí primero;
      // fallback al discountCode legacy del creator si no hay campaña.
      if (data.campaignId) {
        const cc = await prisma.campaignCreator.findUnique({
          where: {
            campaignId_creatorId: { campaignId: data.campaignId, creatorId: data.creatorId },
          },
          select: { discountCode: true },
        })
        if (cc?.discountCode) discountCode = cc.discountCode
      }
      if (!discountCode) {
        const creator = await prisma.creator.findUnique({ where: { id: data.creatorId } })
        if (creator?.discountCode) discountCode = creator.discountCode
      }
      if (discountCode) utmCampaign = utmCampaign || discountCode
    }

    // Crear el link
    const link = await prisma.link.create({
      data: {
        workspaceId: data.workspaceId,
        creatorId: data.creatorId,
        campaignId: data.campaignId,
        slug,
        destination: data.destination,
        title: data.title,
        discountCode,
        utmSource: data.utmSource || "kool",
        utmMedium: data.utmMedium || "affiliate",
        utmCampaign,
      },
    })

    // Crear cupón en Tiendanube si hay código de descuento
    if (discountCode && data.discountValue) {
      try {
        const tnConn = await prisma.tiendanubeConnection.findUnique({
          where: { workspaceId: data.workspaceId },
        })
        if (tnConn?.active) {
          const { decrypt } = await import("@/lib/utils/crypto")
          await createTiendanubeCoupon(tnConn.storeId, decrypt(tnConn.accessToken), {
            code: discountCode,
            type: data.discountType ?? "percentage",
            value: data.discountValue,
            valid: true,
          })
        }
      } catch {
        // El cupón puede ya existir — no es error crítico
      }
    }

    return NextResponse.json({ ok: true, link })
  } catch (error) {
    return handleError("[Links] POST", error)
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
    include: {
      creator: { select: { id: true, name: true, discountCode: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ links })
}
