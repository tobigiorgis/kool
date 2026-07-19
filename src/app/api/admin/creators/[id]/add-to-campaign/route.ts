import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { slugify, generateDiscountCode } from "@/lib/utils"
import { handleError } from "@/lib/api/response"
import { z } from "zod"
import crypto from "crypto"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

const Schema = z.object({
  campaignId: z.string().min(1),
  commissionPct: z.number().min(0).max(100).optional(),
  discountCode: z.string().optional(),
})

function generateSlug(name: string): string {
  const base = slugify(name).slice(0, 20)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${base}-${rand}`
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.link.findUnique({ where: { slug } })
    if (!existing) return slug
    slug = `${slugify(base).slice(0, 20)}-${Math.random().toString(36).slice(2, 6)}`
  }
  return slug
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser()
  if (user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: creatorId } = await params

  try {
    const body = await request.json()
    const data = Schema.parse(body)

    const [creator, campaign] = await Promise.all([
      prisma.creator.findUnique({ where: { id: creatorId } }),
      prisma.campaign.findUnique({
        where: { id: data.campaignId },
        include: { workspace: { select: { id: true, name: true } } },
      }),
    ])

    if (!creator) return NextResponse.json({ error: "Creator no encontrado" }, { status: 404 })
    if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })

    // Si el creator no pertenece a este workspace, upsert en el workspace de la campaña
    let resolvedCreator = creator
    if (creator.workspaceId !== campaign.workspaceId) {
      resolvedCreator = await prisma.creator.upsert({
        where: {
          workspaceId_email: {
            workspaceId: campaign.workspaceId,
            email: creator.email,
          },
        },
        create: {
          workspaceId: campaign.workspaceId,
          name: creator.name,
          firstName: creator.firstName,
          lastName: creator.lastName,
          email: creator.email,
          instagram: creator.instagram,
          tiktok: creator.tiktok,
          status: creator.status,
          commissionPct: data.commissionPct ?? creator.commissionPct,
          discountCode: data.discountCode ?? creator.discountCode,
        },
        update: {},
      })
    }

    const discountCode = data.discountCode || resolvedCreator.discountCode || undefined

    // Upsert CampaignCreator
    await prisma.campaignCreator.upsert({
      where: {
        campaignId_creatorId: {
          campaignId: data.campaignId,
          creatorId: resolvedCreator.id,
        },
      },
      create: {
        campaignId: data.campaignId,
        creatorId: resolvedCreator.id,
        commissionPct: data.commissionPct,
        discountCode,
      },
      update: {
        ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
        ...(discountCode !== undefined && { discountCode }),
      },
    })

    // Upsert CampaignInvite
    await prisma.campaignInvite.upsert({
      where: {
        campaignId_creatorId: {
          campaignId: data.campaignId,
          creatorId: resolvedCreator.id,
        },
      },
      create: {
        campaignId: data.campaignId,
        creatorId: resolvedCreator.id,
        status: "PENDING",
        sentAt: new Date(),
      },
      update: { status: "PENDING", sentAt: new Date() },
    })

    return NextResponse.json({ ok: true, creatorId: resolvedCreator.id })
  } catch (error) {
    return handleError("[Admin] add-to-campaign", error)
  }
}
