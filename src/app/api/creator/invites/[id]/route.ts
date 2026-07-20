import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"
import { ensureAffiliateLink } from "@/lib/api/affiliate-link"
import { z } from "zod"

const InviteActionSchema = z.object({ action: z.enum(["accept", "decline"]) })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { action } = InviteActionSchema.parse(await request.json())

    // Find the invite and verify it belongs to this user's creator profile
    const invite = await prisma.campaignInvite.findUnique({
      where: { id },
      include: { creator: { select: { userId: true, name: true, discountCode: true } } },
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
    const cc = await prisma.campaignCreator.findUnique({
      where: { campaignId_creatorId: { campaignId: invite.campaignId, creatorId: invite.creatorId } },
    })
    await prisma.campaignCreator.updateMany({
      where: { campaignId: invite.campaignId, creatorId: invite.creatorId },
      data: { status },
    })

    if (action === "accept") {
      await ensureAffiliateLink({
        creatorId: invite.creatorId,
        campaignId: invite.campaignId,
        creatorName: invite.creator.name,
        discountCode: cc?.discountCode ?? invite.creator.discountCode,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError("[Creator/invites] PATCH", error)
  }
}
