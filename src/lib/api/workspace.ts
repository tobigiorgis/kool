import { auth } from "@clerk/nextjs/server"
import type { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notFound, unauthorized } from "@/lib/api/response"

/** Workspace del usuario (primer membership). Extraído de las 5 copias duplicadas en api/drops/**. */
export async function getWorkspaceId(userId: string): Promise<string | null> {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })
  return member?.workspaceId ?? null
}

type WorkspaceResult =
  | { userId: string; workspaceId: string; error?: undefined }
  | { error: NextResponse; userId?: undefined; workspaceId?: undefined }

/**
 * Auth + workspace en un paso para API routes.
 * Uso:
 *   const ws = await requireWorkspace()
 *   if (ws.error) return ws.error
 *   const { userId, workspaceId } = ws
 */
export async function requireWorkspace(): Promise<WorkspaceResult> {
  const { userId } = await auth()
  if (!userId) return { error: unauthorized() }
  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return { error: notFound("No workspace") }
  return { userId, workspaceId }
}
