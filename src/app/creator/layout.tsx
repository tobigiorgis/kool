import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CreatorSidebar } from "@/components/creator/CreatorSidebar"

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({ where: { userId } })
  if (!creator) redirect("/onboarding/creator")

  const campaignCreators = await prisma.campaignCreator.findMany({
    where: { creatorId: creator.id, status: "ACCEPTED" },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          workspace: { select: { id: true, name: true, brandLogo: true, brandColor: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const pendingInvites = await prisma.campaignInvite.count({
    where: { creatorId: creator.id, status: "PENDING" },
  })

  const programs = campaignCreators.map((cc) => ({
    campaignId: cc.campaignId,
    campaignName: cc.campaign.name,
    brandName: cc.campaign.workspace.name,
    brandLogo: cc.campaign.workspace.brandLogo,
    brandColor: cc.campaign.workspace.brandColor,
  }))

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <CreatorSidebar
        creatorName={creator.firstName ? `${creator.firstName} ${creator.lastName ?? ""}`.trim() : creator.name}
        creatorAvatar={creator.avatar}
        programs={programs}
        pendingInvites={pendingInvites}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
