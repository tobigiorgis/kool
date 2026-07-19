import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ok, unauthorized } from "@/lib/api/response"

// GET — campaigns where the logged-in user is a collaborator
export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const collaborations = await prisma.campaignCollaborator.findMany({
    where: { userId, status: { in: ["PENDING", "ACCEPTED"] } },
    include: {
      campaign: {
        include: {
          workspace: { select: { name: true, logo: true } },
          _count: { select: { creators: true } },
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  })

  return ok({ collaborations })
}
