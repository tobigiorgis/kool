import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getTiendanubeAuthUrl } from "@/lib/tiendanube"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!))

  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })

  if (!member) return NextResponse.redirect(new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL!))

  // state = workspaceId, lo recuperamos en el callback
  const authUrl = getTiendanubeAuthUrl(member.workspaceId)
  return NextResponse.redirect(authUrl)
}
