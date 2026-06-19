import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ok, fail, unauthorized, notFound, badRequest } from "@/lib/api/response"
import { logger } from "@/lib/logger"
import { z } from "zod"

const UpdateAchievementSchema = z.object({
  status: z.enum(["ACHIEVED", "FULFILLED"]).optional(),
  fulfillmentRef: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// PATCH: marcar un achievement como entregado (FULFILLED) o agregar nota/ref
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bountyId: string; achievementId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id, bountyId, achievementId } = await params

  try {
    const achievement = await prisma.bountyAchievement.findUnique({
      where: { id: achievementId },
      include: { bounty: { include: { campaign: { select: { id: true, workspaceId: true } } } } },
    })
    if (!achievement || achievement.bountyId !== bountyId || achievement.bounty.campaignId !== id) {
      return notFound()
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: achievement.bounty.campaign.workspaceId },
    })
    if (!member) return fail("No access", 403)

    const body = await request.json()
    const data = UpdateAchievementSchema.parse(body)

    const updated = await prisma.bountyAchievement.update({
      where: { id: achievementId },
      data: {
        ...data,
        fulfilledAt:
          data.status === "FULFILLED" ? new Date() : data.status === "ACHIEVED" ? null : undefined,
      },
    })

    return ok({ achievement: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Datos inválidos")
    }
    logger.error("[Bounties] Achievement PATCH", error)
    return fail("Error al actualizar", 500)
  }
}
