import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createTiendanubeCoupon } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { slugify } from "@/lib/utils"
import { z } from "zod"

const AddCreatorsSchema = z.object({
  creatorIds: z.array(z.string()).min(1),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
  destination: z.string().url().optional(),
})

const UpdateCreatorSchema = z.object({
  creatorId: z.string(),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
  destination: z.string().url().optional(),
})

function generateSlug(creatorName: string): string {
  const base = slugify(creatorName).slice(0, 20)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${base}-${rand}`
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base
  let attempts = 0
  while (attempts < 5) {
    const existing = await prisma.link.findUnique({ where: { slug } })
    if (!existing) return slug
    slug = `${slugify(base).slice(0, 20)}-${Math.random().toString(36).slice(2, 6)}`
    attempts++
  }
  return slug
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params

  try {
    const body = await request.json()
    const data = AddCreatorsSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

    // Obtener la conexión con Tiendanube
    const connection = await prisma.tiendanubeConnection.findUnique({
      where: { workspaceId: campaign.workspaceId },
    })

    const results = await Promise.all(
      data.creatorIds.map(async (creatorId) => {
        const creator = await prisma.creator.findUnique({ where: { id: creatorId } })
        if (!creator) return null

        // Upsert CampaignCreator
        const cc = await prisma.campaignCreator.upsert({
          where: { campaignId_creatorId: { campaignId, creatorId } },
          create: {
            campaignId,
            creatorId,
            commissionPct: data.commissionPct,
            discountCode: data.discountCode,
          },
          update: {
            ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
            ...(data.discountCode !== undefined && { discountCode: data.discountCode }),
          },
        })

        // Crear link de afiliado si se proporcionó destino y no existe ya uno
        if (data.destination) {
          const existingLink = await prisma.link.findFirst({
            where: { creatorId, campaignId },
          })

          if (!existingLink) {
            const slug = await ensureUniqueSlug(generateSlug(creator.name))
            await prisma.link.create({
              data: {
                workspaceId: campaign.workspaceId,
                creatorId,
                campaignId,
                slug,
                destination: data.destination,
                discountCode: data.discountCode,
                utmSource: slugify(creator.name),
                utmMedium: "influencer",
                utmCampaign: data.discountCode || undefined,
              },
            })
          }
        }

        // Crear cupón en Tiendanube si hay código
        if (data.discountCode && connection?.active) {
          try {
            const accessToken = decrypt(connection.accessToken)
            await createTiendanubeCoupon(connection.storeId, accessToken, {
              code: data.discountCode,
              type: "percentage",
              value: data.commissionPct ?? 10,
              valid: true,
            })
          } catch (e: any) {
            if (!e?.message?.includes("422")) {
              console.error(`[Campaign] Error creando cupón ${data.discountCode}:`, e)
            }
          }
        }

        return cc
      })
    )

    return NextResponse.json({ ok: true, added: results.filter(Boolean).length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Campaign] Add creators error:", error)
    return NextResponse.json({ error: "Error al agregar creators" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params

  try {
    const body = await request.json()
    const data = UpdateCreatorSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

    // Obtener el registro actual para detectar cambios en el código
    const existing = await prisma.campaignCreator.findUnique({
      where: { campaignId_creatorId: { campaignId, creatorId: data.creatorId } },
    })
    if (!existing) return NextResponse.json({ error: "Creator not in campaign" }, { status: 404 })

    // Actualizar CampaignCreator
    const cc = await prisma.campaignCreator.update({
      where: { campaignId_creatorId: { campaignId, creatorId: data.creatorId } },
      data: {
        ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
        ...(data.discountCode !== undefined && { discountCode: data.discountCode }),
      },
    })

    // Actualizar el link asociado
    const link = await prisma.link.findFirst({
      where: { creatorId: data.creatorId, campaignId },
    })

    if (link) {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          ...(data.destination && { destination: data.destination }),
          ...(data.discountCode !== undefined && {
            discountCode: data.discountCode,
            utmCampaign: data.discountCode || undefined,
          }),
        },
      })
    } else if (data.destination) {
      // Crear link si se provee destino y no existía
      const creator = await prisma.creator.findUnique({ where: { id: data.creatorId } })
      if (creator) {
        const slug = await ensureUniqueSlug(generateSlug(creator.name))
        await prisma.link.create({
          data: {
            workspaceId: campaign.workspaceId,
            creatorId: data.creatorId,
            campaignId,
            slug,
            destination: data.destination,
            discountCode: data.discountCode,
            utmSource: slugify(creator.name),
            utmMedium: "influencer",
            utmCampaign: data.discountCode || undefined,
          },
        })
      }
    }

    // Si el código cambió, crear nuevo cupón en Tiendanube
    if (data.discountCode && data.discountCode !== existing.discountCode) {
      const connection = await prisma.tiendanubeConnection.findUnique({
        where: { workspaceId: campaign.workspaceId },
      })
      if (connection?.active) {
        try {
          const accessToken = decrypt(connection.accessToken)
          await createTiendanubeCoupon(connection.storeId, accessToken, {
            code: data.discountCode,
            type: "percentage",
            value: data.commissionPct ?? cc.commissionPct ?? 10,
            valid: true,
          })
        } catch (e: any) {
          if (!e?.message?.includes("422")) {
            console.error(`[Campaign] Error creando cupón ${data.discountCode}:`, e)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Campaign] Update creator error:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params
  const creatorId = request.nextUrl.searchParams.get("creatorId")
  if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 })

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  // Archivar el link asociado en vez de borrarlo (preservar analytics)
  await prisma.link.updateMany({
    where: { creatorId, campaignId },
    data: { archived: true },
  })

  await prisma.campaignCreator.deleteMany({
    where: { campaignId, creatorId },
  })

  return NextResponse.json({ ok: true })
}
