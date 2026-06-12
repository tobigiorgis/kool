import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createTiendanubeCoupon } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { slugify, generateDiscountCode } from "@/lib/utils"
import { sendCampaignInviteExisting, sendCampaignInviteNew } from "@/lib/email"
import { z } from "zod"
import crypto from "crypto"

// Schema for inviting via email (new flow)
const InviteCreatorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
  destination: z.string().url().optional(),
})

// Schema for adding existing creators (legacy flow)
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

    // Normalize: support both single creatorId and creatorIds array
    if (body.creatorId && !body.creatorIds && !body.email) {
      body.creatorIds = [body.creatorId]
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { workspace: { select: { name: true } } },
    })
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

    const connection = await prisma.tiendanubeConnection.findUnique({
      where: { workspaceId: campaign.workspaceId },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.kool.link"

    // ── New invite-by-email flow ───────────────
    if ("email" in body) {
      const data = InviteCreatorSchema.parse(body)
      const name = `${data.firstName} ${data.lastName}`
      const discountCode = data.discountCode || generateDiscountCode(data.firstName, data.commissionPct ?? 10)

      // Find or create creator
      let creator = await prisma.creator.findFirst({
        where: { workspaceId: campaign.workspaceId, email: data.email },
      })

      const inviteToken = crypto.randomBytes(32).toString("hex")

      if (!creator) {
        creator = await prisma.creator.create({
          data: {
            workspaceId: campaign.workspaceId,
            name,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            commissionPct: data.commissionPct ?? 10,
            discountCode,
            status: "PENDING",
            inviteToken,
            invitedAt: new Date(),
          },
        })
      } else {
        // Update invite token if re-inviting
        creator = await prisma.creator.update({
          where: { id: creator.id },
          data: { inviteToken, invitedAt: new Date() },
        })
      }

      // Upsert CampaignCreator
      await prisma.campaignCreator.upsert({
        where: { campaignId_creatorId: { campaignId, creatorId: creator.id } },
        create: {
          campaignId,
          creatorId: creator.id,
          commissionPct: data.commissionPct,
          discountCode,
        },
        update: {
          ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
          discountCode,
        },
      })

      // Upsert CampaignInvite
      await prisma.campaignInvite.upsert({
        where: { campaignId_creatorId: { campaignId, creatorId: creator.id } },
        create: { campaignId, creatorId: creator.id, status: "PENDING" },
        update: { status: "PENDING", sentAt: new Date(), respondedAt: null },
      })

      // Create affiliate link if destination provided
      if (data.destination) {
        const existingLink = await prisma.link.findFirst({ where: { creatorId: creator.id, campaignId } })
        if (!existingLink) {
          const slug = await ensureUniqueSlug(generateSlug(name))
          await prisma.link.create({
            data: {
              workspaceId: campaign.workspaceId,
              creatorId: creator.id,
              campaignId,
              slug,
              destination: data.destination,
              discountCode,
              utmSource: slugify(name),
              utmMedium: "influencer",
            },
          })
        }
      }

      // Create Tiendanube coupon
      if (discountCode && connection?.active) {
        try {
          const accessToken = decrypt(connection.accessToken)
          await createTiendanubeCoupon(connection.storeId, accessToken, {
            code: discountCode,
            type: "percentage",
            value: data.commissionPct ?? 10,
            valid: true,
          })
        } catch (e: any) {
          if (!e?.message?.includes("422")) console.error(`[Campaign] Coupon error:`, e)
        }
      }

      const brandName = campaign.workspace.name

      // Send email — new vs existing
      if (creator.userId) {
        await sendCampaignInviteExisting({
          to: data.email,
          creatorName: data.firstName,
          brandName,
          campaignName: campaign.name,
          discountCode,
          commissionPct: data.commissionPct,
          dashboardUrl: `${appUrl}/creator`,
        })
      } else {
        const registerUrl = `${appUrl}/register?token=${inviteToken}`
        await sendCampaignInviteNew({
          to: data.email,
          creatorName: data.firstName,
          brandName,
          campaignName: campaign.name,
          discountCode,
          commissionPct: data.commissionPct,
          registerUrl,
        })
      }

      return NextResponse.json({ ok: true, creatorId: creator.id })
    }

    // ── Legacy: add existing creators by ID ───
    const data = AddCreatorsSchema.parse(body)

    const results = await Promise.all(
      data.creatorIds.map(async (creatorId) => {
        const creator = await prisma.creator.findUnique({ where: { id: creatorId } })
        if (!creator) return null

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

        await prisma.campaignInvite.upsert({
          where: { campaignId_creatorId: { campaignId, creatorId } },
          create: { campaignId, creatorId, status: "PENDING", sentAt: new Date() },
          update: { status: "PENDING", sentAt: new Date() },
        })

        if (data.destination) {
          const existingLink = await prisma.link.findFirst({ where: { creatorId, campaignId } })
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
            if (!e?.message?.includes("422")) console.error(`[Campaign] Coupon error:`, e)
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
