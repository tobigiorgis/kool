import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ensureTiendanubeCoupon } from "@/lib/api/coupon"
import { slugify, generateDiscountCode } from "@/lib/utils"
import { sendCampaignInviteExisting, sendCampaignInviteNew } from "@/lib/email"
import { ok, fail, unauthorized, notFound, badRequest, handleError } from "@/lib/api/response"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { creatorUrl } from "@/lib/host"
import { z } from "zod"
import crypto from "crypto"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id: campaignId } = await params

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return notFound()

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return fail("No access", 403)

  const campaignCreators = await prisma.campaignCreator.findMany({
    where: { campaignId },
    include: {
      creator: { select: { id: true, name: true, firstName: true, lastName: true, discountCode: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return ok({ campaignCreators })
}

// Schema for inviting via email (new flow)
const InviteCreatorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
  discountPct: z.number().min(1).max(100).optional(),
  destination: z.string().url().optional(),
})

// Schema for adding existing creators (legacy flow)
const AddCreatorsSchema = z.object({
  creatorIds: z.array(z.string()).min(1),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
  discountPct: z.number().min(1).max(100).optional(),
  destination: z.string().url().optional(),
})

const UpdateCreatorSchema = z.object({
  creatorId: z.string(),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
  discountPct: z.number().min(1).max(100).optional(),
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

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
    if (!campaign) return notFound()

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return fail("No access", 403)

    const appUrl = env.NEXT_PUBLIC_APP_URL

    // ── New invite-by-email flow ───────────────
    if ("email" in body) {
      const data = InviteCreatorSchema.parse(body)
      const name = `${data.firstName} ${data.lastName}`
      const discountCode = data.discountCode || undefined

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
            commissionPct: data.commissionPct ?? null,
            discountCode,
            discountPct: data.discountPct ?? null,
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
          discountPct: data.discountPct,
        },
        update: {
          ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
          ...(data.discountPct !== undefined && { discountPct: data.discountPct }),
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
        const existingLink = await prisma.link.findFirst({
          where: { creatorId: creator.id, campaignId },
        })
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

      // Crear el cupón en Tiendanube (idempotente, no-op si no hay tienda)
      await ensureTiendanubeCoupon({
        workspaceId: campaign.workspaceId,
        code: discountCode,
        discountPct: data.discountPct,
      })

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
          dashboardUrl: creatorUrl(""),
        })
      } else {
        const registerUrl = `${appUrl}/register?role=creator&token=${inviteToken}`
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

      return ok({ creatorId: creator.id })
    }

    // ── Legacy: add existing creators by ID ───
    const data = AddCreatorsSchema.parse(body)

    const results = await Promise.all(
      data.creatorIds.map(async (creatorId) => {
        const creator = await prisma.creator.findUnique({ where: { id: creatorId } })
        if (!creator) return null

        // No clonamos el creator al workspace de la campaña: CampaignCreator/
        // CampaignInvite no están atados a un workspace propio, así que el mismo
        // creator puede sumarse a campañas de marcas distintas a la suya sin
        // crear un perfil duplicado (que quedaría sin userId/inviteToken, inaccesible).
        const resolvedCreatorId = creator.id

        const cc = await prisma.campaignCreator.upsert({
          where: { campaignId_creatorId: { campaignId, creatorId: resolvedCreatorId } },
          create: {
            campaignId,
            creatorId: resolvedCreatorId,
            commissionPct: data.commissionPct,
            discountCode: data.discountCode,
            discountPct: data.discountPct,
          },
          update: {
            ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
            ...(data.discountCode !== undefined && { discountCode: data.discountCode }),
            ...(data.discountPct !== undefined && { discountPct: data.discountPct }),
          },
        })

        await prisma.campaignInvite.upsert({
          where: { campaignId_creatorId: { campaignId, creatorId: resolvedCreatorId } },
          create: { campaignId, creatorId: resolvedCreatorId, status: "PENDING", sentAt: new Date() },
          update: { status: "PENDING", sentAt: new Date() },
        })

        if (data.destination) {
          const existingLink = await prisma.link.findFirst({ where: { creatorId: resolvedCreatorId, campaignId } })
          if (!existingLink) {
            const slug = await ensureUniqueSlug(generateSlug(creator.name))
            await prisma.link.create({
              data: {
                workspaceId: campaign.workspaceId,
                creatorId: resolvedCreatorId,
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

        await ensureTiendanubeCoupon({
          workspaceId: campaign.workspaceId,
          code: data.discountCode,
          discountPct: data.discountPct,
        })

        return cc
      })
    )

    return ok({ added: results.filter(Boolean).length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Datos inválidos", error.errors)
    }
    logger.error("[Campaigns creators] POST", error)
    return fail("Error al agregar creators", 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id: campaignId } = await params

  try {
    const body = await request.json()
    const data = UpdateCreatorSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return notFound()

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return fail("No access", 403)

    // Obtener el registro actual para detectar cambios en el código
    const existing = await prisma.campaignCreator.findUnique({
      where: { campaignId_creatorId: { campaignId, creatorId: data.creatorId } },
    })
    if (!existing) return fail("Creator not in campaign", 404)

    // Actualizar CampaignCreator
    const cc = await prisma.campaignCreator.update({
      where: { campaignId_creatorId: { campaignId, creatorId: data.creatorId } },
      data: {
        ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
        ...(data.discountCode !== undefined && { discountCode: data.discountCode }),
        ...(data.discountPct !== undefined && { discountPct: data.discountPct }),
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

    // Si el código o el % de descuento cambió, (re)crear el cupón en Tiendanube.
    const codeChanged = data.discountCode && data.discountCode !== existing.discountCode
    const pctChanged = data.discountPct !== undefined && data.discountPct !== existing.discountPct
    if (codeChanged || pctChanged) {
      await ensureTiendanubeCoupon({
        workspaceId: campaign.workspaceId,
        code: cc.discountCode,
        discountPct: cc.discountPct,
      })
    }

    return ok()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Datos inválidos", error.errors)
    }
    logger.error("[Campaigns creators] PATCH", error)
    return fail("Error al actualizar", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id: campaignId } = await params
  const creatorId = request.nextUrl.searchParams.get("creatorId")
  if (!creatorId) return badRequest("Missing creatorId")

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return notFound()

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return fail("No access", 403)

    // Archivar el link asociado en vez de borrarlo (preservar analytics)
    await prisma.link.updateMany({
      where: { creatorId, campaignId },
      data: { archived: true },
    })

    await prisma.campaignCreator.deleteMany({
      where: { campaignId, creatorId },
    })

    return ok()
  } catch (error) {
    return handleError("[Campaigns creators] DELETE", error)
  }
}
