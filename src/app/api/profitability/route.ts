import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { calculateDropProfitability } from "@/lib/drops/profitability"

async function getWorkspaceId(userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })
  return member?.workspaceId ?? null
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const view = request.nextUrl.searchParams.get("view") || "drops"

  const drops = await prisma.drop.findMany({
    where: { workspaceId },
    select: { id: true },
    orderBy: { launchDate: "desc" },
  })

  const results = await Promise.all(
    drops.map((d) => calculateDropProfitability(d.id))
  )

  if (view === "products") {
    const allProducts = results.flatMap((r) =>
      r.products.map((p) => ({
        ...p,
        dropId: r.drop.id,
        dropName: r.drop.name,
        dropStatus: r.drop.status,
        dropLaunchDate: r.drop.launchDate,
      }))
    )
    allProducts.sort((a, b) => b.profit - a.profit)
    return NextResponse.json({ products: allProducts })
  }

  const dropsData = results.map((r) => ({
    id: r.drop.id,
    name: r.drop.name,
    status: r.drop.status,
    launchDate: r.drop.launchDate,
    productCount: r.products.length,
    totalRevenue: r.totalRevenue,
    totalCosts: r.totalCosts,
    totalProfit: r.totalProfit,
    totalMargin: r.totalMargin,
    totalUnitsSold: r.totalUnitsSold,
    stockSoldPct: r.stockSoldPct,
  }))
  dropsData.sort((a, b) => b.totalProfit - a.totalProfit)

  return NextResponse.json({ drops: dropsData })
}
