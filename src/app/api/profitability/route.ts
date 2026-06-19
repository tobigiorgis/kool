import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateDropProfitability } from "@/lib/drops/profitability"
import { requireWorkspace } from "@/lib/api/workspace"
import { handleError } from "@/lib/api/response"

export async function GET(request: NextRequest) {
  const ws = await requireWorkspace()
  if (ws.error) return ws.error
  const { workspaceId } = ws

  const view = request.nextUrl.searchParams.get("view") || "drops"

  try {
    const drops = await prisma.drop.findMany({
      where: { workspaceId },
      select: { id: true },
      orderBy: { launchDate: "desc" },
    })

    const results = await Promise.all(drops.map((d) => calculateDropProfitability(d.id)))

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
  } catch (error) {
    return handleError("[Profitability] GET", error)
  }
}
