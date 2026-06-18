import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Verifica que el usuario tenga acceso al workspace de la campaña
async function getCampaignWithAccess(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return { error: "Not found" as const, status: 404 }
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return { error: "No access" as const, status: 403 }
  return { campaign }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const access = await getCampaignWithAccess(id, userId)
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status })

  const bounties = await prisma.bounty.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    include: {
      tiers: { orderBy: { threshold: "asc" } },
      achievements: {
        orderBy: { achievedAt: "desc" },
        include: {
          creator: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  return NextResponse.json({ bounties })
}

const TierSchema = z.object({
  threshold: z.number().positive(),
  rewardType: z.enum(["CASH", "PRODUCT", "CUSTOM"]),
  rewardValue: z.number().positive().nullable().optional(),
  rewardProductId: z.string().nullable().optional(),
  rewardProductName: z.string().nullable().optional(),
  rewardDescription: z.string().nullable().optional(),
})

const CreateBountySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  metric: z.enum(["SALES", "REVENUE"]).default("SALES"),
  tiers: z.array(TierSchema).min(1),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const access = await getCampaignWithAccess(id, userId)
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const body = await request.json()
    const data = CreateBountySchema.parse(body)

    const bounty = await prisma.bounty.create({
      data: {
        campaignId: id,
        name: data.name,
        description: data.description ?? null,
        metric: data.metric,
        tiers: {
          create: data.tiers
            .slice()
            .sort((a, b) => a.threshold - b.threshold)
            .map((t, i) => ({
              threshold: t.threshold,
              rewardType: t.rewardType,
              rewardValue: t.rewardType === "CASH" ? (t.rewardValue ?? null) : null,
              rewardProductId: t.rewardType === "PRODUCT" ? (t.rewardProductId ?? null) : null,
              rewardProductName: t.rewardType === "PRODUCT" ? (t.rewardProductName ?? null) : null,
              rewardDescription: t.rewardDescription ?? null,
              order: i,
            })),
        },
      },
      include: { tiers: { orderBy: { threshold: "asc" } }, achievements: true },
    })

    return NextResponse.json({ ok: true, bounty })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Bounties] Create error:", error)
    return NextResponse.json({ error: "Error al crear bounty" }, { status: 500 })
  }
}
