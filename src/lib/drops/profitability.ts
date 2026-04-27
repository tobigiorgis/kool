import { prisma } from "@/lib/prisma"

// ─── Avance de producción ─────────────────────────────────────────────────────

const LOCAL_STAGE_PROGRESS: Record<string, number> = {
  NOT_STARTED: 0,
  FABRIC_PURCHASE: 20,
  CUTTING: 40,
  PRINT: 60,
  SEWING: 80,
  PACKAGING: 100,
}

const IMPORT_STAGE_PROGRESS: Record<string, number> = {
  NOT_STARTED: 0,
  INITIAL_PAYMENT: 20,
  IN_PRODUCTION: 40,
  IN_TRANSIT: 60,
  RECEIVED: 80,
  PACKAGING: 100,
}

export function getProductProgress(product: {
  productionType: string
  productionStage?: string | null
  importStage?: string | null
}): number {
  if (product.productionType === "LOCAL") {
    return LOCAL_STAGE_PROGRESS[product.productionStage || "NOT_STARTED"] ?? 0
  }
  return IMPORT_STAGE_PROGRESS[product.importStage || "NOT_STARTED"] ?? 0
}

export function calculateDropProductionProgress(
  products: {
    productionType: string
    productionStage?: string | null
    importStage?: string | null
  }[]
): number {
  if (products.length === 0) return 0
  const total = products.reduce((sum, p) => sum + getProductProgress(p), 0)
  return Math.round(total / products.length)
}

export interface ProductProfitability {
  productId: string
  productName: string
  unitsSold: number
  revenue: number
  unitCost: number
  directCosts: number
  assignedExpenses: number
  sharedExpenses: number
  dropExpenses: number
  totalCosts: number
  profit: number
  margin: number
  stockSold: number
  stockTotal: number
  stockSoldPct: number
}

export async function calculateProductProfitability(
  productId: string
): Promise<ProductProfitability> {
  const product = await prisma.dropProduct.findUnique({
    where: { id: productId },
    include: {
      drop: {
        include: {
          products: { select: { id: true } },
          expenses: { include: { assignments: true } },
        },
      },
      sales: true,
    },
  })

  if (!product) throw new Error("Product not found")

  const unitsSold = product.sales.reduce((sum, s) => sum + s.quantity, 0)
  const revenue = product.sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const directCosts = product.unitCost * unitsSold

  let assignedExpenses = 0
  let sharedExpenses = 0
  let dropExpenses = 0

  const totalProductsInDrop = product.drop.products.length

  for (const expense of product.drop.expenses) {
    if (expense.scope === "DROP") {
      dropExpenses += expense.amount / totalProductsInDrop
    } else {
      const isAssigned = expense.assignments.some(
        (a) => a.dropProductId === productId
      )
      if (!isAssigned) continue

      const assignedCount = expense.assignments.length
      if (assignedCount === 1) {
        assignedExpenses += expense.amount
      } else {
        sharedExpenses += expense.amount / assignedCount
      }
    }
  }

  const totalCosts = directCosts + assignedExpenses + sharedExpenses + dropExpenses
  const profit = revenue - totalCosts
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0

  return {
    productId: product.id,
    productName: product.name,
    unitsSold,
    revenue,
    unitCost: product.unitCost,
    directCosts,
    assignedExpenses,
    sharedExpenses,
    dropExpenses,
    totalCosts,
    profit,
    margin,
    stockSold: unitsSold,
    stockTotal: product.initialStock,
    stockSoldPct:
      product.initialStock > 0 ? (unitsSold / product.initialStock) * 100 : 0,
  }
}

export async function calculateDropProfitability(dropId: string) {
  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    include: { products: true },
  })

  if (!drop) throw new Error("Drop not found")

  const productProfitabilities = await Promise.all(
    drop.products.map((p) => calculateProductProfitability(p.id))
  )

  const totalRevenue = productProfitabilities.reduce((s, p) => s + p.revenue, 0)
  const totalCosts = productProfitabilities.reduce((s, p) => s + p.totalCosts, 0)
  const totalProfit = totalRevenue - totalCosts
  const totalMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const totalUnitsSold = productProfitabilities.reduce(
    (s, p) => s + p.unitsSold,
    0
  )
  const totalStock = productProfitabilities.reduce(
    (s, p) => s + p.stockTotal,
    0
  )
  const stockSoldPct =
    totalStock > 0 ? (totalUnitsSold / totalStock) * 100 : 0

  return {
    drop,
    products: productProfitabilities,
    totalRevenue,
    totalCosts,
    totalProfit,
    totalMargin,
    totalUnitsSold,
    totalStock,
    stockSoldPct,
    topByProfit: [...productProfitabilities].sort(
      (a, b) => b.profit - a.profit
    ),
    topBySales: [...productProfitabilities].sort(
      (a, b) => b.unitsSold - a.unitsSold
    ),
  }
}
