import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function CreatorRootPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({ where: { userId } })
  if (!creator) redirect("/onboarding/creator")

  const firstProgram = await prisma.campaignCreator.findFirst({
    where: { creatorId: creator.id, status: "ACCEPTED" },
    orderBy: { createdAt: "desc" },
  })

  if (firstProgram) redirect(`/creator/program/${firstProgram.campaignId}`)

  redirect("/creator/programs")
}
