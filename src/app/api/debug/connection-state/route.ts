import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ok, unauthorized } from "@/lib/api/response"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })

  if (!member) return ok({ error: "no workspace" })

  const connection = await prisma.tiendanubeConnection.findUnique({
    where: { workspaceId: member.workspaceId },
    select: {
      storeId: true,
      storeName: true,
      storeUrl: true,
      storeDomain: true,
      active: true,
    },
  })

  return ok({
    workspaceId: member.workspaceId,
    connection,
  })
}
