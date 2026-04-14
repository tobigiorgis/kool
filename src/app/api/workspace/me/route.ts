import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: {
      workspace: {
        include: { tiendanubeConnection: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  if (!member) {
    return NextResponse.json({ workspace: null, role: null })
  }

  return NextResponse.json({ workspace: member.workspace, role: member.role })
}
