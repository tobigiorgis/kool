import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { workspaceId } = await params
  const period = req.nextUrl.searchParams.get("period") ?? "30d"

  const creator = await prisma.creator.findFirst({
    where: { workspaceId, userId },
  })
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let dateFilter: { gte?: Date } = {}
  if (period === "30d") {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    dateFilter = { gte: d }
  } else if (period === "90d") {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    dateFilter = { gte: d }
  }

  const where = {
    creatorId: creator.id,
    ...(dateFilter.gte ? { createdAt: dateFilter } : {}),
  }

  const commissions = await prisma.commission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      orderAmount: true,
      percentage: true,
      status: true,
      createdAt: true,
    },
  })

  const total = commissions.reduce((sum, c) => sum + c.amount, 0)

  return NextResponse.json({
    commissions: commissions.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    total,
  })
}
