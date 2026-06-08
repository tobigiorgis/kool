import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { action } = await request.json() as { action: "accept" | "decline" }

  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  // Find the invite and verify it belongs to this user's creator profile
  const invite = await prisma.campaignInvite.findUnique({
    where: { id },
    include: { creator: { select: { userId: true } } },
  })

  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invite.creator.userId !== userId) {
    return NextResponse.json({ error: "No access" }, { status: 403 })
  }

  const status = action === "accept" ? "ACCEPTED" : "DECLINED"

  await prisma.campaignInvite.update({
    where: { id },
    data: { status, respondedAt: new Date() },
  })

  // Sync CampaignCreator status
  await prisma.campaignCreator.updateMany({
    where: { campaignId: invite.campaignId, creatorId: invite.creatorId },
    data: { status },
  })

  return NextResponse.json({ ok: true })
}
