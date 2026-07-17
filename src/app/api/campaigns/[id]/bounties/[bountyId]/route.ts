import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ok, fail, unauthorized, badRequest, handleError } from "@/lib/api/response"
import { logger } from "@/lib/logger"
import { z } from "zod"

// Verifica acceso y que el bounty pertenezca a la campaña del workspace del usuario
async function getBountyWithAccess(campaignId: string, bountyId: string, userId: string) {
  const bounty = await prisma.bounty.findUnique({
    where: { id: bountyId },
    include: { campaign: { select: { id: true, workspaceId: true } } },
  })
  if (!bounty || bounty.campaignId !== campaignId)
    return { error: "Not found" as const, status: 404 }
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: bounty.campaign.workspaceId },
  })
  if (!member) return { error: "No access" as const, status: 403 }
  return { bounty }
}

const TierSchema = z.object({
  threshold: z.number().positive(),
  rewardType: z.enum(["CASH", "PRODUCT", "CUSTOM"]),
  rewardValue: z.number().nullable().optional(),
  rewardProductName: z.string().nullable().optional(),
  rewardDescription: z.string().nullable().optional(),
})

const UpdateBountySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
  metric: z.enum(["SALES", "REVENUE"]).optional(),
  endDate: z.string().nullable().optional(),
  tiers: z.array(TierSchema).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bountyId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id, bountyId } = await params

  try {
    const access = await getBountyWithAccess(id, bountyId, userId)
    if ("error" in access)
      return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const data = UpdateBountySchema.parse(body)

    const { tiers, endDate, ...bountyData } = data

    const updated = await prisma.bounty.update({
      where: { id: bountyId },
      data: {
        ...bountyData,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      },
      include: { tiers: { orderBy: { threshold: "asc" } } },
    })

    if (tiers) {
      await prisma.bountyTier.deleteMany({ where: { bountyId } })
      await prisma.bountyTier.createMany({
        data: tiers.map((t, i) => ({
          bountyId,
          threshold: t.threshold,
          rewardType: t.rewardType,
          rewardValue: t.rewardValue ?? null,
          rewardProductName: t.rewardProductName ?? null,
          rewardDescription: t.rewardDescription ?? null,
          order: i,
        })),
      })
    }

    return ok({ bounty: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Datos inválidos")
    }
    logger.error("[Bounties] PATCH", error)
    return fail("Error al actualizar", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bountyId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id, bountyId } = await params

  try {
    const access = await getBountyWithAccess(id, bountyId, userId)
    if ("error" in access)
      return NextResponse.json({ error: access.error }, { status: access.status })

    await prisma.bounty.delete({ where: { id: bountyId } })
    return ok()
  } catch (error) {
    return handleError("[Bounties] DELETE", error)
  }
}
