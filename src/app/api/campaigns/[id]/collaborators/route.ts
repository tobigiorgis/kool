import { NextRequest } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendCollaboratorInvite } from "@/lib/email"
import { ok, fail, unauthorized, notFound, badRequest, handleError } from "@/lib/api/response"
import { env } from "@/lib/env"
import { z } from "zod"
import crypto from "crypto"

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
})

// GET — list collaborators (workspace members only)
export async function GET(
  _req: NextRequest,
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

  const collaborators = await prisma.campaignCollaborator.findMany({
    where: { campaignId },
    include: { user: { select: { name: true, avatar: true } } },
    orderBy: { invitedAt: "desc" },
  })

  return ok({ collaborators })
}

// POST — invite collaborator by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id: campaignId } = await params

  try {
    const body = await request.json()
    const data = InviteSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { workspace: { select: { name: true } } },
    })
    if (!campaign) return notFound()

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return fail("No access", 403)

    // Get inviter name
    const clerkUser = await currentUser()
    const inviterName =
      clerkUser?.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
        : clerkUser?.emailAddresses[0]?.emailAddress ?? "Un miembro del equipo"

    const inviteToken = crypto.randomBytes(32).toString("hex")

    // Check if invited user already has a Kool account
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } })

    // Upsert collaborator
    const collaborator = await prisma.campaignCollaborator.upsert({
      where: { campaignId_email: { campaignId, email: data.email } },
      create: {
        campaignId,
        email: data.email,
        userId: existingUser?.id ?? null,
        role: data.role,
        status: existingUser ? "ACCEPTED" : "PENDING",
        inviteToken: existingUser ? null : inviteToken,
        invitedAt: new Date(),
        acceptedAt: existingUser ? new Date() : null,
      },
      update: {
        role: data.role,
        status: existingUser ? "ACCEPTED" : "PENDING",
        inviteToken: existingUser ? null : inviteToken,
        invitedAt: new Date(),
        acceptedAt: existingUser ? new Date() : null,
        userId: existingUser?.id ?? undefined,
      },
    })

    // Build accept URL
    const acceptUrl = existingUser
      ? `${env.NEXT_PUBLIC_APP_URL}/dashboard/collaborations`
      : `${env.NEXT_PUBLIC_APP_URL}/register?role=collaborator&token=${inviteToken}`

    await sendCollaboratorInvite({
      to: data.email,
      inviterName,
      brandName: campaign.workspace.name,
      campaignName: campaign.name,
      role: data.role,
      acceptUrl,
    })

    return ok({ collaboratorId: collaborator.id, alreadyRegistered: !!existingUser })
  } catch (error) {
    return handleError("[Collaborators] POST", error)
  }
}
