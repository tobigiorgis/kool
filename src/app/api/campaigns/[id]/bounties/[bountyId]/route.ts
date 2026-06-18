import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
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

const UpdateBountySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bountyId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, bountyId } = await params
  const access = await getBountyWithAccess(id, bountyId, userId)
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const body = await request.json()
    const data = UpdateBountySchema.parse(body)

    const updated = await prisma.bounty.update({
      where: { id: bountyId },
      data,
      include: { tiers: { orderBy: { threshold: "asc" } } },
    })

    return NextResponse.json({ ok: true, bounty: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    console.error("[Bounties] Update error:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bountyId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, bountyId } = await params
  const access = await getBountyWithAccess(id, bountyId, userId)
  if ("error" in access)
    return NextResponse.json({ error: access.error }, { status: access.status })

  await prisma.bounty.delete({ where: { id: bountyId } })
  return NextResponse.json({ ok: true })
}
