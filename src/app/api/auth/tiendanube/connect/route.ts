import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getTiendanubeAuthUrl } from "@/lib/tiendanube"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })

  if (!member) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const authUrl = getTiendanubeAuthUrl(member.workspaceId)
  return NextResponse.json({ url: authUrl })
}
