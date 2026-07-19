import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"
import { z } from "zod"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

const Schema = z.object({
  campaignId: z.string().min(1),
  commissionPct: z.number().min(0).max(100).optional(),
  discountCode: z.string().optional(),
})

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
      prisma.campaign.findUnique({ where: { id: data.campaignId } }),
    ])

    if (!creator) return NextResponse.json({ error: "Creator no encontrado" }, { status: 404 })
    if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })

    const discountCode = data.discountCode || creator.discountCode || undefined

    // CampaignCreator/CampaignInvite no están atados a un workspace propio, así
    // que un creator se puede sumar a campañas de marcas distintas a la suya sin
    // clonar su perfil (evita duplicados fantasma sin userId/inviteToken).
    await prisma.campaignCreator.upsert({
      where: {
        campaignId_creatorId: {
          campaignId: data.campaignId,
          creatorId: creator.id,
        },
      },
      create: {
        campaignId: data.campaignId,
        creatorId: creator.id,
        commissionPct: data.commissionPct,
        discountCode,
      },
      update: {
        ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
        ...(discountCode !== undefined && { discountCode }),
      },
    })

    await prisma.campaignInvite.upsert({
      where: {
        campaignId_creatorId: {
          campaignId: data.campaignId,
          creatorId: creator.id,
        },
      },
      create: {
        campaignId: data.campaignId,
        creatorId: creator.id,
        status: "PENDING",
        sentAt: new Date(),
      },
      update: { status: "PENDING", sentAt: new Date() },
    })

    return NextResponse.json({ ok: true, creatorId: creator.id })
  } catch (error) {
    return handleError("[Admin] add-to-campaign", error)
  }
}
