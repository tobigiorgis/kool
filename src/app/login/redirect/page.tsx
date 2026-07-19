import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { roleHomeUrl } from "@/lib/host"

export default async function LoginRedirectPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  redirect(roleHomeUrl(user?.role === "CREATOR" ? "creator" : "brand"))
}
