import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let creators = await prisma.creator.findMany({
      where: { userId },
      include: { workspace: true },
    })

    if (creators.length === 0) {
      const clerkUser = await currentUser()
      const email = clerkUser?.emailAddresses[0]?.emailAddress
      if (email) {
        creators = await prisma.creator.findMany({
          where: { email, status: "ACTIVE" },
          include: { workspace: true },
        })
      }
    }

    const programs = creators.map((c) => ({
      creatorId: c.id,
      workspaceId: c.workspaceId,
      workspaceName: c.workspace.name,
      workspaceLogo: c.workspace.brandLogo ?? c.workspace.logo,
      commissionPct: c.commissionPct,
      discountCode: c.discountCode,
      tier: c.tier,
      status: c.status,
    }))

    return NextResponse.json({ programs })
  } catch (error) {
    return handleError("[Creator/programs] GET", error)
  }
}
