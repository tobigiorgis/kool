import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const creator = await prisma.creator.findFirst({ where: { userId } })
  if (!creator) return NextResponse.json({ invites: [] })

  const invites = await prisma.campaignInvite.findMany({
    where: { creatorId: creator.id, status: "PENDING" },
    include: {
      campaign: {
        include: { workspace: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Find CampaignCreator entries to get per-creator commission/discount
  const campaignCreators = await prisma.campaignCreator.findMany({
    where: {
      creatorId: creator.id,
      campaignId: { in: invites.map((i) => i.campaignId) },
    },
  })

  const ccMap = new Map(campaignCreators.map((cc) => [cc.campaignId, cc]))

  const result = invites.map((invite) => {
    const cc = ccMap.get(invite.campaignId)
    return {
      id: invite.id,
      campaignId: invite.campaignId,
      campaignName: invite.campaign.name,
      brandName: invite.campaign.workspace.name,
      brandLogo: invite.campaign.workspace.brandLogo,
      brandColor: invite.campaign.workspace.brandColor,
      discountCode: cc?.discountCode ?? creator.discountCode,
      commissionPct: cc?.commissionPct ?? creator.commissionPct ?? 10,
    }
  })

  return NextResponse.json({ invites: result })
}
