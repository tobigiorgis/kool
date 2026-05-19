import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CreatorSidebar from "@/components/creator/CreatorSidebar"

async function getOrLinkCreators(userId: string) {
  // First try finding by userId
  const byUserId = await prisma.creator.findMany({
    where: { userId },
    include: { workspace: true },
  })
  if (byUserId.length > 0) return byUserId

  // Fallback by email
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress
  if (!email) return []

  const byEmail = await prisma.creator.findMany({
    where: { email, status: "ACTIVE" },
    include: { workspace: true },
  })

  // Link userId for any that don't have it (pick the first one to link)
  // Since userId is @unique, only one Creator can have a given userId
  const unlinked = byEmail.filter((c) => !c.userId)
  if (unlinked.length > 0) {
    // Upsert user record
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        name: clerkUser?.fullName ?? unlinked[0].name,
        role: "CREATOR",
      },
      update: {},
    })
    // Link only the first unlinked creator (userId is @unique)
    await prisma.creator.update({
      where: { id: unlinked[0].id },
      data: { userId },
    })
  }

  return byEmail
}

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creators = await getOrLinkCreators(userId)
  if (creators.length === 0) redirect("/onboarding/creator")

  const programs = creators.map((c) => ({
    creatorId: c.id,
    workspaceId: c.workspaceId,
    workspaceName: c.workspace.name,
    workspaceLogo: c.workspace.brandLogo ?? c.workspace.logo,
    commissionPct: c.commissionPct,
    discountCode: c.discountCode,
  }))

  return (
    <div className="flex min-h-screen bg-white">
      <CreatorSidebar programs={programs} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
