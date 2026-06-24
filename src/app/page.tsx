import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { creatorUrl, appUrl } from "@/lib/host"

// Solo corre en el host app/apex (en creator.* el middleware reescribe "/" → /creator).
export default async function RootPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  // Rutear por rol al host correcto: creators → creator.*, marcas → app.*
  const creator = await prisma.creator.findFirst({ where: { userId }, select: { id: true } })
  if (creator) redirect(creatorUrl(""))
  redirect(appUrl("dashboard"))
}
