import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { fail, unauthorized, notFound, handleError } from "@/lib/api/response"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id } = await params

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } })
    if (!campaign) return notFound()

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return fail("No access", 403)

    const status = request.nextUrl.searchParams.get("status") as
      | "PENDING"
      | "ACCEPTED"
      | "REJECTED"
      | null

    const applications = await prisma.application.findMany({
      where: {
        campaignId: id,
        ...(status ? { status } : {}),
      },
      include: {
        answers: {
          include: { question: true },
          orderBy: { question: { order: "asc" } },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ applications })
  } catch (error) {
    return handleError("[Campaigns applications] GET", error)
  }
}
