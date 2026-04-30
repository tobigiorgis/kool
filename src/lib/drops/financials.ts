import { prisma } from "@/lib/prisma"

export async function getDropFinancials(dropId: string) {
  const [drop, cash, debts] = await Promise.all([
    prisma.drop.findUnique({
      where: { id: dropId },
      include: {
        products: { include: { sales: true } },
        expenses: { include: { assignments: true } },
        debts: { orderBy: { dueDate: "asc" } },
        cash: true,
      },
    }),
    prisma.dropCash.findUnique({ where: { dropId } }),
    prisma.dropDebt.findMany({ where: { dropId }, orderBy: { dueDate: "asc" } }),
  ])

  if (!drop) throw new Error("Drop not found")

  const currentRevenue = drop.products.reduce(
    (sum, p) => sum + p.sales.reduce((s, sale) => s + sale.totalAmount, 0), 0
  )

  const totalStock = drop.products.reduce((s, p) => s + p.initialStock, 0)
  const totalSold = drop.products.reduce(
    (sum, p) => sum + p.sales.reduce((s, sale) => s + sale.quantity, 0), 0
  )
  const soldPct = totalStock > 0 ? totalSold / totalStock : 0

  const totalExpenses = drop.expenses.reduce((s, e) => s + e.amount, 0)

  const expenseDebts = drop.expenses.filter((e) => e.isDebt && !e.paidAt)
  const expenseDebtTotal = expenseDebts.reduce((s, e) => s + e.amount, 0)
  const extraDebtTotal = drop.debts.filter((d) => !d.paidAt).reduce((s, d) => s + d.amount, 0)
  const totalPendingDebt = expenseDebtTotal + extraDebtTotal

  const currentCash = cash?.amount ?? 0

  // Compute effective unit cost per product (from expenses if available, else manual fallback)
  const totalProductsInDrop = drop.products.length
  const effectiveUnitCosts = new Map<string, number>()
  for (const product of drop.products) {
    let assigned = 0, shared = 0, dropExp = 0
    for (const expense of drop.expenses) {
      if (expense.scope === "DROP") {
        dropExp += expense.amount / totalProductsInDrop
      } else {
        const isAssigned = expense.assignments.some((a) => a.dropProductId === product.id)
        if (!isAssigned) continue
        const count = expense.assignments.length
        if (count === 1) assigned += expense.amount
        else shared += expense.amount / count
      }
    }
    const totalFromExpenses = assigned + shared + dropExp
    const effectiveCost = totalFromExpenses > 0
      ? totalFromExpenses / product.initialStock
      : (product.unitCost ?? 0)
    effectiveUnitCosts.set(product.id, effectiveCost)
  }

  const maxRevenue = drop.products.reduce((sum, p) => sum + p.price * p.initialStock, 0)

  // Break-even: cuántos ingresos necesitás para cubrir los gastos fijos
  // breakEvenRevenue = gastos totales (los gastos son el "costo" fijo del drop)
  const breakEvenRevenue = totalExpenses > 0 ? totalExpenses : null
  const breakEvenPct = maxRevenue > 0 && breakEvenRevenue
    ? (breakEvenRevenue / maxRevenue) * 100
    : null
  const avgPrice = totalStock > 0 ? maxRevenue / totalStock : 0
  const breakEvenUnits = avgPrice > 0 && breakEvenRevenue
    ? Math.ceil(breakEvenRevenue / avgPrice)
    : null

  const forecasts = [0.25, 0.5, 0.75, 1].map((pct) => {
    const projectedUnits = Math.round(totalStock * pct)
    const projectedRevenue = drop.products.reduce((sum, p) => {
      return sum + p.price * Math.round(p.initialStock * pct)
    }, 0)
    // Gastos son fijos — ya se incurrieron independientemente de cuánto se vende
    const projectedProfit = projectedRevenue - totalExpenses
    const projectedMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0
    return { salesPct: pct, projectedUnits, projectedRevenue, projectedProfit, projectedMargin }
  })

  const expensesByCategory = drop.expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  // Combined debts list for frontend — expense debts + extra debts
  const allDebts = [
    ...expenseDebts.map((e) => ({
      id: `expense-${e.id}`,
      sourceId: e.id,
      sourceType: "expense" as const,
      description: `${e.category} (gasto)`,
      amount: e.amount,
      currency: e.currency,
      creditor: e.creditor,
      dueDate: e.dueDate,
      paidAt: e.paidAt,
      notes: e.notes,
    })),
    ...drop.debts.map((d) => ({
      id: `debt-${d.id}`,
      sourceId: d.id,
      sourceType: "debt" as const,
      description: d.description,
      amount: d.amount,
      currency: d.currency,
      creditor: d.creditor,
      dueDate: d.dueDate,
      paidAt: d.paidAt,
      notes: d.notes,
    })),
  ].sort((a, b) => {
    if (!a.paidAt && b.paidAt) return -1
    if (a.paidAt && !b.paidAt) return 1
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  return {
    currentRevenue,
    totalStock,
    totalSold,
    soldPct,
    totalExpenses,
    totalPendingDebt,
    allDebts,
    currentCash,
    maxRevenue,
    breakEvenUnits,
    breakEvenRevenue,
    breakEvenPct,
    forecasts,
    expensesByCategory,
    products: drop.products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      unitCost: effectiveUnitCosts.get(p.id) ?? 0,
      initialStock: p.initialStock,
    })),
  }
}
