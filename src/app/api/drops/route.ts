import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

async function getWorkspaceId(userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })
  return member?.workspaceId ?? null
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const drops = await prisma.drop.findMany({
    where: { workspaceId },
    include: {
      products: {
        select: { id: true, sales: { select: { quantity: true, totalAmount: true } }, initialStock: true },
      },
      expenses: { select: { amount: true } },
    },
    orderBy: { launchDate: "desc" },
  })

  const dropsWithMetrics = drops.map((drop) => {
    const totalRevenue = drop.products.flatMap((p) => p.sales).reduce((s, sale) => s + sale.totalAmount, 0)
    const totalUnitsSold = drop.products.flatMap((p) => p.sales).reduce((s, sale) => s + sale.quantity, 0)
    const totalStock = drop.products.reduce((s, p) => s + p.initialStock, 0)
    const totalExpenses = drop.expenses.reduce((s, e) => s + e.amount, 0)
    const profit = totalRevenue - totalExpenses
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    const stockSoldPct = totalStock > 0 ? (totalUnitsSold / totalStock) * 100 : 0

    return {
      id: drop.id,
      name: drop.name,
      slug: drop.slug,
      description: drop.description,
      coverImage: drop.coverImage,
      launchDate: drop.launchDate,
      closeDate: drop.closeDate,
      status: drop.status,
      createdAt: drop.createdAt,
      productCount: drop.products.length,
      totalRevenue,
      totalExpenses,
      profit,
      margin,
      stockSoldPct,
    }
  })

  return NextResponse.json({ drops: dropsWithMetrics })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const body = await request.json()
  const { name, description, coverImage, launchDate, closeDate, products } = body

  if (!name || !launchDate) {
    return NextResponse.json({ error: "name and launchDate are required" }, { status: 400 })
  }

  const slug =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36)

  const drop = await prisma.drop.create({
    data: {
      workspaceId,
      name,
      slug,
      description: description || null,
      coverImage: coverImage || null,
      launchDate: new Date(launchDate),
      closeDate: closeDate ? new Date(closeDate) : null,
      status: "DRAFT",
      products: products?.length
        ? {
            create: products.map((p: any) => ({
              name: p.name,
              description: p.description || null,
              image: p.image || null,
              sku: p.sku || null,
              price: Number(p.price),
              unitCost: Number(p.unitCost),
              initialStock: Number(p.initialStock),
            })),
          }
        : undefined,
    },
    include: { products: true },
  })

  return NextResponse.json({ drop }, { status: 201 })
}
