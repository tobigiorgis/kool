import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ok, fail, unauthorized, notFound, badRequest, handleError } from "@/lib/api/response"
import { z } from "zod"

const PatchSchema = z.object({ role: z.enum(["EDITOR", "VIEWER"]) })

async function getOwnerAccess(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return null
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  return member ? campaign : null
}

// PATCH — change role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id: campaignId, collaboratorId } = await params

  try {
    const campaign = await getOwnerAccess(campaignId, userId)
    if (!campaign) return fail("No access", 403)

    const body = await request.json()
    const data = PatchSchema.parse(body)

    const collaborator = await prisma.campaignCollaborator.findFirst({
      where: { id: collaboratorId, campaignId },
    })
    if (!collaborator) return notFound()

    await prisma.campaignCollaborator.update({
      where: { id: collaboratorId },
      data: { role: data.role },
    })

    return ok()
  } catch (error) {
    return handleError("[Collaborators] PATCH", error)
  }
}

// DELETE — remove collaborator
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id: campaignId, collaboratorId } = await params

  try {
    const campaign = await getOwnerAccess(campaignId, userId)
    if (!campaign) return fail("No access", 403)

    const collaborator = await prisma.campaignCollaborator.findFirst({
      where: { id: collaboratorId, campaignId },
    })
    if (!collaborator) return notFound()

    await prisma.campaignCollaborator.delete({ where: { id: collaboratorId } })

    return ok()
  } catch (error) {
    return handleError("[Collaborators] DELETE", error)
  }
}
