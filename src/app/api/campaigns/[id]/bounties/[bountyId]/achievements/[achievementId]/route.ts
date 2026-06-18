import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, bountyId, achievementId } = await params

  const achievement = await prisma.bountyAchievement.findUnique({
    where: { id: achievementId },
    include: { bounty: { include: { campaign: { select: { id: true, workspaceId: true } } } } },
  })
  if (!achievement || achievement.bountyId !== bountyId || achievement.bounty.campaignId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: achievement.bounty.campaign.workspaceId },
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  try {
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

    return NextResponse.json({ ok: true, achievement: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    console.error("[Bounties] Achievement update error:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}
