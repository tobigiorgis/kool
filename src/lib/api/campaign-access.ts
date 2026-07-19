import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fail } from "@/lib/api/response"

export type CampaignAccessRole = "OWNER" | "EDITOR" | "VIEWER"

export type CampaignAccess =
  | { role: "OWNER"; workspaceId: string; error?: never }
  | { role: "EDITOR" | "VIEWER"; collaboratorId: string; workspaceId: string; error?: never }
  | { error: NextResponse; role?: never }

/**
 * Resolves access level for a user on a specific campaign.
 * - OWNER: workspace member (full access)
 * - EDITOR / VIEWER: accepted CampaignCollaborator
 * - error: no access (403)
 */
export async function requireCampaignAccess(
  campaignId: string,
  userId: string
): Promise<CampaignAccess> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { workspaceId: true },
  })

  if (!campaign) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) }

  // 1. Workspace member → OWNER
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (member) return { role: "OWNER", workspaceId: campaign.workspaceId }

  // 2. Accepted collaborator
  const collaborator = await prisma.campaignCollaborator.findFirst({
    where: { campaignId, userId, status: "ACCEPTED" },
  })
  if (collaborator) {
    return {
      role: collaborator.role as "EDITOR" | "VIEWER",
      collaboratorId: collaborator.id,
      workspaceId: campaign.workspaceId,
    }
  }

  return { error: fail("No access", 403) }
}

export function isOwner(access: CampaignAccess): boolean {
  return !access.error && access.role === "OWNER"
}

export function canEdit(access: CampaignAccess): boolean {
  return !access.error && (access.role === "OWNER" || access.role === "EDITOR")
}
