import { prisma } from "@/lib/prisma"

export function getSaleRealStatus(sale: {
  status: string
  startDate: Date
  endDate: Date
}): "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED" {
  if (sale.status === "CANCELLED") return "CANCELLED"
  const now = new Date()
  if (now < sale.startDate) return "SCHEDULED"
  if (now > sale.endDate) return "ENDED"
  return "ACTIVE"
}

export async function isDropOnSale(dropId: string): Promise<boolean> {
  const sale = await prisma.dropSale.findUnique({ where: { dropId } })
  if (!sale) return false
  return getSaleRealStatus(sale) === "ACTIVE"
}

export async function getEffectiveProductPrice(dropProductId: string): Promise<{
  price: number
  originalPrice: number
  discountPct: number
  onSale: boolean
}> {
  const product = await prisma.dropProduct.findUnique({
    where: { id: dropProductId },
    include: {
      drop: { include: { sale: true } },
      saleDiscount: true,
    },
  })

  if (!product) throw new Error("Product not found")

  const sale = product.drop.sale
  const isActive = sale && getSaleRealStatus(sale) === "ACTIVE"

  if (!isActive || !sale) {
    return { price: product.price, originalPrice: product.price, discountPct: 0, onSale: false }
  }

  let discountPct = 0
  if (product.saleDiscount) {
    discountPct = product.saleDiscount.discountPct
  } else if (sale.generalDiscountPct) {
    discountPct = sale.generalDiscountPct
  }

  return {
    price: product.price * (1 - discountPct / 100),
    originalPrice: product.price,
    discountPct,
    onSale: discountPct > 0,
  }
}

export async function getSaleStats(dropId: string) {
  const sale = await prisma.dropSale.findUnique({
    where: { dropId },
    include: {
      productDiscounts: {
        include: { dropProduct: true },
      },
    },
  })

  if (!sale) return null

  const salesDuring = await prisma.dropProductSale.findMany({
    where: { dropProduct: { dropId }, duringSale: true },
    include: { dropProduct: true },
  })

  const salesBefore = await prisma.dropProductSale.findMany({
    where: {
      dropProduct: { dropId },
      duringSale: false,
      soldAt: { lt: sale.startDate },
    },
  })

  const unitsSoldDuring = salesDuring.reduce((s, v) => s + v.quantity, 0)
  const revenueDuring = salesDuring.reduce((s, v) => s + v.totalAmount, 0)
  const unitsSoldBefore = salesBefore.reduce((s, v) => s + v.quantity, 0)
  const revenueBefore = salesBefore.reduce((s, v) => s + v.totalAmount, 0)

  const revenueLostToDiscount = salesDuring.reduce((sum, v) => {
    if (!v.saleDiscountPct) return sum
    const originalAmount = v.totalAmount / (1 - v.saleDiscountPct / 100)
    return sum + (originalAmount - v.totalAmount)
  }, 0)

  const now = new Date()
  const daysActive = sale.startDate < now
    ? Math.floor(
        (Math.min(now.getTime(), sale.endDate.getTime()) - sale.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
      )
    : 0
  const avgDailyRevenue = daysActive > 0 ? revenueDuring / daysActive : 0

  // Agrupar ventas durante el sale por producto
  const byProduct: Record<string, { units: number; revenue: number }> = {}
  for (const v of salesDuring) {
    if (!byProduct[v.dropProductId]) byProduct[v.dropProductId] = { units: 0, revenue: 0 }
    byProduct[v.dropProductId].units += v.quantity
    byProduct[v.dropProductId].revenue += v.totalAmount
  }

  return {
    sale,
    realStatus: getSaleRealStatus(sale),
    unitsSoldDuring,
    revenueDuring,
    unitsSoldBefore,
    revenueBefore,
    revenueLostToDiscount,
    daysActive,
    avgDailyRevenue,
    byProduct,
  }
}
