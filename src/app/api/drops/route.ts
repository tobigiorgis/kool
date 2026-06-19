import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { calculateDropProductionProgress } from "@/lib/drops/profitability"
import { requireWorkspace } from "@/lib/api/workspace"
import { badRequest, handleError } from "@/lib/api/response"

const ProductSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  image: z.string().nullish(),
  sku: z.string().nullish(),
  price: z.coerce.number(),
  unitCost: z.coerce.number(),
  initialStock: z.coerce.number(),
  productionType: z.string().nullish(),
})

const CreateDropSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  coverImage: z.string().nullish(),
  launchDate: z.string(),
  closeDate: z.string().nullish(),
  products: z.array(ProductSchema).nullish(),
})

export async function GET() {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const drops = await prisma.drop.findMany({
      where: { workspaceId },
      include: {
        products: {
          select: {
            id: true,
            initialStock: true,
            productionType: true,
            productionStage: true,
            importStage: true,
            sales: { select: { quantity: true, totalAmount: true } },
          },
        },
        expenses: { select: { amount: true } },
        sale: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            status: true,
            generalDiscountPct: true,
          },
        },
      },
      orderBy: { launchDate: "desc" },
    })

    const dropsWithMetrics = drops.map((drop) => {
      const totalRevenue = drop.products
        .flatMap((p) => p.sales)
        .reduce((s, sale) => s + sale.totalAmount, 0)
      const totalUnitsSold = drop.products
        .flatMap((p) => p.sales)
        .reduce((s, sale) => s + sale.quantity, 0)
      const totalStock = drop.products.reduce((s, p) => s + p.initialStock, 0)
      const totalExpenses = drop.expenses.reduce((s, e) => s + e.amount, 0)
      const profit = totalRevenue - totalExpenses
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
      const stockSoldPct = totalStock > 0 ? (totalUnitsSold / totalStock) * 100 : 0
      const productionProgress = calculateDropProductionProgress(drop.products)

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
        productionProgress,
        totalRevenue,
        totalExpenses,
        profit,
        margin,
        stockSoldPct,
        sale: drop.sale ?? null,
      }
    })

    return NextResponse.json({ drops: dropsWithMetrics })
  } catch (error) {
    return handleError("[Drops] GET /api/drops", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const body = await request.json()
    const data = CreateDropSchema.parse(body)
    const { name, description, coverImage, launchDate, closeDate, products } = data

    if (!name || !launchDate) {
      return badRequest("name and launchDate are required")
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
        status: "PRE_LAUNCH",
        products: products?.length
          ? {
              create: products.map((p) => {
                const isImport = p.productionType === "IMPORT"
                return {
                  name: p.name,
                  description: p.description || null,
                  image: p.image || null,
                  sku: p.sku || null,
                  price: Number(p.price),
                  unitCost: Number(p.unitCost),
                  initialStock: Number(p.initialStock),
                  productionType: isImport ? "IMPORT" : "LOCAL",
                  productionStage: isImport ? null : "NOT_STARTED",
                  importStage: isImport ? "NOT_STARTED" : null,
                }
              }),
            }
          : undefined,
      },
      include: { products: true },
    })

    return NextResponse.json({ drop }, { status: 201 })
  } catch (error) {
    return handleError("[Drops] POST /api/drops", error)
  }
}
