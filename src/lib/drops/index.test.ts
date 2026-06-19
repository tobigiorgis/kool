import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock de prisma ───────────────────────────────────────────────────────────
// Solo nos interesa la LÓGICA DE CÁLCULO, así que controlamos lo que devuelve la
// capa de datos y ejercitamos la aritmética de profit/costos/márgenes/deudas.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dropProduct: { findUnique: vi.fn() },
    drop: { findUnique: vi.fn() },
    dropCash: { findUnique: vi.fn() },
    dropDebt: { findMany: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  getProductProgress,
  calculateDropProductionProgress,
  calculateProductProfitability,
} from "./profitability"
import { getSaleRealStatus } from "./sales"
import { stageProgressColor } from "./stages"
import { getDropFinancials } from "./financials"

const mockedProduct = vi.mocked(prisma.dropProduct.findUnique)
const mockedDrop = vi.mocked(prisma.drop.findUnique)
const mockedCash = vi.mocked(prisma.dropCash.findUnique)
const mockedDebt = vi.mocked(prisma.dropDebt.findMany)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── getProductProgress (puro) ─────────────────────────────────────────────────

describe("getProductProgress", () => {
  it("maps each LOCAL production stage to its progress", () => {
    expect(getProductProgress({ productionType: "LOCAL", productionStage: "NOT_STARTED" })).toBe(0)
    expect(
      getProductProgress({ productionType: "LOCAL", productionStage: "FABRIC_PURCHASE" })
    ).toBe(20)
    expect(getProductProgress({ productionType: "LOCAL", productionStage: "CUTTING" })).toBe(40)
    expect(getProductProgress({ productionType: "LOCAL", productionStage: "PRINT" })).toBe(60)
    expect(getProductProgress({ productionType: "LOCAL", productionStage: "SEWING" })).toBe(80)
    expect(getProductProgress({ productionType: "LOCAL", productionStage: "PACKAGING" })).toBe(100)
  })

  it("maps each IMPORT stage to its progress", () => {
    expect(getProductProgress({ productionType: "IMPORT", importStage: "INITIAL_PAYMENT" })).toBe(
      20
    )
    expect(getProductProgress({ productionType: "IMPORT", importStage: "IN_PRODUCTION" })).toBe(40)
    expect(getProductProgress({ productionType: "IMPORT", importStage: "IN_TRANSIT" })).toBe(60)
    expect(getProductProgress({ productionType: "IMPORT", importStage: "RECEIVED" })).toBe(80)
    expect(getProductProgress({ productionType: "IMPORT", importStage: "PACKAGING" })).toBe(100)
  })

  it("defaults to NOT_STARTED (0) when stage is null/undefined", () => {
    expect(getProductProgress({ productionType: "LOCAL", productionStage: null })).toBe(0)
    expect(getProductProgress({ productionType: "IMPORT", importStage: null })).toBe(0)
    expect(getProductProgress({ productionType: "LOCAL" })).toBe(0)
  })

  it("returns 0 for an unknown stage value", () => {
    expect(getProductProgress({ productionType: "LOCAL", productionStage: "BOGUS" })).toBe(0)
    expect(getProductProgress({ productionType: "IMPORT", importStage: "BOGUS" })).toBe(0)
  })

  it("uses the LOCAL table for LOCAL and the IMPORT table otherwise", () => {
    // INITIAL_PAYMENT only exists in the IMPORT table, so a LOCAL product → 0
    expect(
      getProductProgress({ productionType: "LOCAL", productionStage: "INITIAL_PAYMENT" })
    ).toBe(0)
    // CUTTING only exists in the LOCAL table, so an IMPORT product → 0
    expect(getProductProgress({ productionType: "IMPORT", importStage: "CUTTING" })).toBe(0)
  })
})

// ─── calculateDropProductionProgress (puro) ────────────────────────────────────

describe("calculateDropProductionProgress", () => {
  it("returns 0 for an empty product list (no division by zero)", () => {
    expect(calculateDropProductionProgress([])).toBe(0)
  })

  it("averages the progress across products", () => {
    const progress = calculateDropProductionProgress([
      { productionType: "LOCAL", productionStage: "NOT_STARTED" }, // 0
      { productionType: "LOCAL", productionStage: "PACKAGING" }, // 100
    ])
    expect(progress).toBe(50)
  })

  it("rounds the average to the nearest integer", () => {
    // (20 + 40 + 60) / 3 = 40 exact
    expect(
      calculateDropProductionProgress([
        { productionType: "LOCAL", productionStage: "FABRIC_PURCHASE" }, // 20
        { productionType: "LOCAL", productionStage: "CUTTING" }, // 40
        { productionType: "LOCAL", productionStage: "PRINT" }, // 60
      ])
    ).toBe(40)

    // (100 + 0 + 0) / 3 = 33.33… → rounds to 33
    expect(
      calculateDropProductionProgress([
        { productionType: "LOCAL", productionStage: "PACKAGING" }, // 100
        { productionType: "LOCAL", productionStage: "NOT_STARTED" }, // 0
        { productionType: "LOCAL", productionStage: "NOT_STARTED" }, // 0
      ])
    ).toBe(33)

    // (80 + 80 + 0) / 3 = 53.33… → rounds to 53
    expect(
      calculateDropProductionProgress([
        { productionType: "LOCAL", productionStage: "SEWING" }, // 80
        { productionType: "LOCAL", productionStage: "SEWING" }, // 80
        { productionType: "LOCAL", productionStage: "NOT_STARTED" }, // 0
      ])
    ).toBe(53)
  })

  it("mixes LOCAL and IMPORT products correctly", () => {
    expect(
      calculateDropProductionProgress([
        { productionType: "LOCAL", productionStage: "SEWING" }, // 80
        { productionType: "IMPORT", importStage: "IN_TRANSIT" }, // 60
      ])
    ).toBe(70)
  })
})

// ─── getSaleRealStatus (puro) ──────────────────────────────────────────────────

describe("getSaleRealStatus", () => {
  const day = 24 * 60 * 60 * 1000

  it("returns CANCELLED regardless of dates when status is CANCELLED", () => {
    expect(
      getSaleRealStatus({
        status: "CANCELLED",
        startDate: new Date(Date.now() - day),
        endDate: new Date(Date.now() + day),
      })
    ).toBe("CANCELLED")
  })

  it("returns SCHEDULED when now is before startDate", () => {
    expect(
      getSaleRealStatus({
        status: "ACTIVE",
        startDate: new Date(Date.now() + day),
        endDate: new Date(Date.now() + 2 * day),
      })
    ).toBe("SCHEDULED")
  })

  it("returns ENDED when now is after endDate", () => {
    expect(
      getSaleRealStatus({
        status: "ACTIVE",
        startDate: new Date(Date.now() - 2 * day),
        endDate: new Date(Date.now() - day),
      })
    ).toBe("ENDED")
  })

  it("returns ACTIVE when now is within the window", () => {
    expect(
      getSaleRealStatus({
        status: "ACTIVE",
        startDate: new Date(Date.now() - day),
        endDate: new Date(Date.now() + day),
      })
    ).toBe("ACTIVE")
  })
})

// ─── stageProgressColor (puro) ─────────────────────────────────────────────────

describe("stageProgressColor", () => {
  it("returns green at exactly 100", () => {
    expect(stageProgressColor(100)).toBe("bg-green-500")
  })

  it("returns blue between 60 and 99", () => {
    expect(stageProgressColor(60)).toBe("bg-blue-400")
    expect(stageProgressColor(99)).toBe("bg-blue-400")
  })

  it("returns yellow between 20 and 59", () => {
    expect(stageProgressColor(20)).toBe("bg-yellow-400")
    expect(stageProgressColor(59)).toBe("bg-yellow-400")
  })

  it("returns gray below 20 (including 0)", () => {
    expect(stageProgressColor(0)).toBe("bg-gray-200")
    expect(stageProgressColor(19)).toBe("bg-gray-200")
  })
})

// ─── calculateProductProfitability (prisma mockeado) ───────────────────────────
// Helper para construir el objeto que devuelve prisma.dropProduct.findUnique con
// el shape exacto que la función lee.
function buildProduct(overrides: {
  id?: string
  name?: string
  initialStock?: number
  unitCost?: number | null
  sales?: { quantity: number; totalAmount: number }[]
  dropProductIds?: string[]
  expenses?: {
    scope: string
    amount: number
    assignments: { dropProductId: string }[]
  }[]
}) {
  const id = overrides.id ?? "p1"
  return {
    id,
    name: overrides.name ?? "Remera",
    initialStock: overrides.initialStock ?? 0,
    unitCost: overrides.unitCost ?? null,
    sales: overrides.sales ?? [],
    drop: {
      products: (overrides.dropProductIds ?? [id]).map((pid) => ({ id: pid })),
      expenses: overrides.expenses ?? [],
    },
  }
}

describe("calculateProductProfitability", () => {
  it("computes revenue/profit/margin from manual unitCost when there are no expenses", async () => {
    mockedProduct.mockResolvedValue(
      buildProduct({
        id: "p1",
        initialStock: 100,
        unitCost: 10,
        sales: [
          { quantity: 30, totalAmount: 600 },
          { quantity: 20, totalAmount: 400 },
        ],
      }) as never
    )

    const r = await calculateProductProfitability("p1")

    expect(r.unitsSold).toBe(50)
    expect(r.revenue).toBe(1000)
    expect(r.unitCost).toBe(10) // manual fallback
    expect(r.unitCostIsCalculated).toBe(false)
    expect(r.unitCostManual).toBe(10)
    expect(r.directCosts).toBe(500) // 10 * 50 vendidas
    expect(r.totalCosts).toBe(1000) // 10 * 100 stock inicial
    expect(r.profit).toBe(500) // 1000 - 500
    expect(r.margin).toBe(50) // 500 / 1000 * 100
    expect(r.stockSold).toBe(50)
    expect(r.stockTotal).toBe(100)
    expect(r.stockSoldPct).toBe(50)
  })

  it("derives unitCost from a single fully-assigned expense", async () => {
    mockedProduct.mockResolvedValue(
      buildProduct({
        id: "p1",
        initialStock: 100,
        unitCost: 999, // debe ignorarse cuando hay gastos
        sales: [{ quantity: 50, totalAmount: 1000 }],
        expenses: [{ scope: "PRODUCT", amount: 2000, assignments: [{ dropProductId: "p1" }] }],
      }) as never
    )

    const r = await calculateProductProfitability("p1")

    expect(r.assignedExpenses).toBe(2000)
    expect(r.sharedExpenses).toBe(0)
    expect(r.dropExpenses).toBe(0)
    expect(r.totalAssignedExpenses).toBe(2000)
    expect(r.unitCostIsCalculated).toBe(true)
    expect(r.unitCost).toBe(20) // 2000 / 100
    expect(r.directCosts).toBe(1000) // 20 * 50
    expect(r.totalCosts).toBe(2000) // 20 * 100
    expect(r.profit).toBe(0) // 1000 - 1000
    expect(r.margin).toBe(0)
  })

  it("splits a shared expense across assigned products and a DROP expense across all products", async () => {
    mockedProduct.mockResolvedValue(
      buildProduct({
        id: "p1",
        initialStock: 10,
        sales: [{ quantity: 5, totalAmount: 500 }],
        dropProductIds: ["p1", "p2", "p3", "p4"], // 4 products in the drop
        expenses: [
          // shared between 2 products → 600 / 2 = 300 to p1
          {
            scope: "PRODUCT",
            amount: 600,
            assignments: [{ dropProductId: "p1" }, { dropProductId: "p2" }],
          },
          // DROP scope → 800 / 4 products = 200 to p1
          { scope: "DROP", amount: 800, assignments: [] },
          // assigned to another product only → ignored for p1
          {
            scope: "PRODUCT",
            amount: 1000,
            assignments: [{ dropProductId: "p2" }],
          },
        ],
      }) as never
    )

    const r = await calculateProductProfitability("p1")

    expect(r.assignedExpenses).toBe(0)
    expect(r.sharedExpenses).toBe(300)
    expect(r.dropExpenses).toBe(200)
    expect(r.totalAssignedExpenses).toBe(500) // 300 + 200
    expect(r.unitCost).toBe(50) // 500 / 10
    expect(r.directCosts).toBe(250) // 50 * 5
    expect(r.totalCosts).toBe(500) // 50 * 10
    expect(r.profit).toBe(250) // 500 - 250
    expect(r.margin).toBe(50)
  })

  it("yields negative profit when costs exceed revenue", async () => {
    mockedProduct.mockResolvedValue(
      buildProduct({
        id: "p1",
        initialStock: 10,
        unitCost: 100,
        sales: [{ quantity: 5, totalAmount: 200 }],
      }) as never
    )

    const r = await calculateProductProfitability("p1")

    expect(r.revenue).toBe(200)
    expect(r.directCosts).toBe(500) // 100 * 5
    expect(r.profit).toBe(-300) // 200 - 500
    expect(r.margin).toBe(-150) // -300 / 200 * 100
  })

  it("handles zero sales and zero costs without dividing by zero", async () => {
    mockedProduct.mockResolvedValue(
      buildProduct({
        id: "p1",
        initialStock: 0, // no stock → no division for unitCost path (no expenses)
        unitCost: null,
        sales: [],
      }) as never
    )

    const r = await calculateProductProfitability("p1")

    expect(r.unitsSold).toBe(0)
    expect(r.revenue).toBe(0)
    expect(r.unitCost).toBe(0) // manual fallback null → 0
    expect(r.directCosts).toBe(0)
    expect(r.totalCosts).toBe(0)
    expect(r.profit).toBe(0)
    expect(r.margin).toBe(0) // revenue 0 → guarded to 0
    expect(r.stockSoldPct).toBe(0) // initialStock 0 → guarded to 0
  })

  it("throws when the product is not found", async () => {
    mockedProduct.mockResolvedValue(null as never)
    await expect(calculateProductProfitability("missing")).rejects.toThrow("Product not found")
  })
})

// ─── getDropFinancials (prisma mockeado) ───────────────────────────────────────

function buildDrop(overrides: {
  products?: {
    id: string
    price: number
    initialStock: number
    unitCost?: number | null
    sales?: { quantity: number; totalAmount: number }[]
  }[]
  expenses?: {
    amount: number
    category?: string
    scope?: string
    isDebt?: boolean
    paidAt?: Date | null
    assignments?: { dropProductId: string }[]
  }[]
  debts?: { amount: number; paidAt?: Date | null; priority?: number; dueDate?: Date | null }[]
}) {
  const products = (overrides.products ?? []).map((p) => ({
    id: p.id,
    name: `name-${p.id}`,
    price: p.price,
    initialStock: p.initialStock,
    unitCost: p.unitCost ?? null,
    sales: p.sales ?? [],
  }))
  const expenses = (overrides.expenses ?? []).map((e, i) => ({
    id: `e${i}`,
    amount: e.amount,
    category: e.category ?? "OTHER",
    scope: e.scope ?? "DROP",
    isDebt: e.isDebt ?? false,
    paidAt: e.paidAt ?? null,
    currency: "ARS",
    creditor: null,
    dueDate: null,
    notes: null,
    assignments: e.assignments ?? [],
  }))
  const debts = (overrides.debts ?? []).map((d, i) => ({
    id: `d${i}`,
    amount: d.amount,
    paidAt: d.paidAt ?? null,
    priority: d.priority ?? 2,
    dueDate: d.dueDate ?? null,
    description: `debt-${i}`,
    currency: "ARS",
    creditor: null,
    notes: null,
  }))
  return { id: "drop1", products, expenses, debts, cash: null }
}

describe("getDropFinancials", () => {
  it("aggregates revenue, stock, sold pct and expenses", async () => {
    const drop = buildDrop({
      products: [
        {
          id: "p1",
          price: 100,
          initialStock: 50,
          sales: [{ quantity: 10, totalAmount: 1000 }],
        },
        {
          id: "p2",
          price: 200,
          initialStock: 50,
          sales: [{ quantity: 30, totalAmount: 6000 }],
        },
      ],
      expenses: [
        { amount: 1500, category: "FABRIC", scope: "DROP" },
        { amount: 500, category: "SHIPPING", scope: "DROP" },
      ],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")

    expect(r.currentRevenue).toBe(7000) // 1000 + 6000
    expect(r.totalStock).toBe(100) // 50 + 50
    expect(r.totalSold).toBe(40) // 10 + 30
    expect(r.soldPct).toBe(0.4) // 40 / 100
    expect(r.totalExpenses).toBe(2000) // 1500 + 500
    expect(r.maxRevenue).toBe(15000) // 100*50 + 200*50
    expect(r.expensesByCategory).toEqual({ FABRIC: 1500, SHIPPING: 500 })
    expect(r.currentCash).toBe(0) // null cash → 0
  })

  it("computes break-even revenue, pct and units (ceil)", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 100, initialStock: 100, sales: [] }],
      expenses: [{ amount: 3000, scope: "DROP" }],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")

    expect(r.maxRevenue).toBe(10000) // 100 * 100
    expect(r.breakEvenRevenue).toBe(3000) // == total expenses
    expect(r.breakEvenPct).toBe(30) // 3000 / 10000 * 100
    // avgPrice = maxRevenue / totalStock = 10000 / 100 = 100
    // breakEvenUnits = ceil(3000 / 100) = 30
    expect(r.breakEvenUnits).toBe(30)
  })

  it("rounds break-even units up when not divisible", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 100, initialStock: 100, sales: [] }],
      expenses: [{ amount: 3050, scope: "DROP" }],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")
    // ceil(3050 / 100) = ceil(30.5) = 31
    expect(r.breakEvenUnits).toBe(31)
  })

  it("returns null break-even fields when there are no expenses", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 100, initialStock: 100, sales: [] }],
      expenses: [],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")
    expect(r.breakEvenRevenue).toBeNull()
    expect(r.breakEvenPct).toBeNull()
    expect(r.breakEvenUnits).toBeNull()
  })

  it("builds forecasts at 25/50/75/100% with fixed expenses", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 100, initialStock: 100, sales: [] }],
      expenses: [{ amount: 2000, scope: "DROP" }],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")
    expect(r.forecasts).toHaveLength(4)

    const f100 = r.forecasts[3]
    expect(f100.salesPct).toBe(1)
    expect(f100.projectedUnits).toBe(100)
    expect(f100.projectedRevenue).toBe(10000) // 100 units * 100 price
    expect(f100.projectedProfit).toBe(8000) // 10000 - 2000 fixed
    expect(f100.projectedMargin).toBe(80) // 8000 / 10000 * 100

    const f25 = r.forecasts[0]
    expect(f25.projectedUnits).toBe(25)
    expect(f25.projectedRevenue).toBe(2500) // round(100*0.25)=25 units * 100
    expect(f25.projectedProfit).toBe(500) // 2500 - 2000
    expect(f25.projectedMargin).toBe(20) // 500 / 2500 * 100
  })

  it("guards forecast margin against zero projected revenue", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 0, initialStock: 100, sales: [] }],
      expenses: [{ amount: 1000, scope: "DROP" }],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")
    const f100 = r.forecasts[3]
    expect(f100.projectedRevenue).toBe(0)
    expect(f100.projectedProfit).toBe(-1000) // 0 - 1000 fixed expenses
    expect(f100.projectedMargin).toBe(0) // revenue 0 → guarded
  })

  it("sums pending debt from unpaid expense-debts plus unpaid extra debts", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 100, initialStock: 10, sales: [] }],
      expenses: [
        { amount: 800, scope: "DROP", isDebt: true, paidAt: null }, // counts
        { amount: 400, scope: "DROP", isDebt: true, paidAt: new Date() }, // paid → excluded
        { amount: 999, scope: "DROP", isDebt: false, paidAt: null }, // not a debt → excluded
      ],
      debts: [
        { amount: 300, paidAt: null }, // counts
        { amount: 200, paidAt: new Date() }, // paid → excluded
      ],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    // financials reads drop.debts (from the include) for extra debts
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")
    expect(r.totalPendingDebt).toBe(1100) // 800 (expense debt) + 300 (extra debt)
  })

  it("reads currentCash from the dropCash record when present", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 100, initialStock: 10, sales: [] }],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue({ amount: 4242 } as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")
    expect(r.currentCash).toBe(4242)
  })

  it("guards soldPct and avgPrice paths when there is no stock", async () => {
    const drop = buildDrop({
      products: [{ id: "p1", price: 100, initialStock: 0, sales: [] }],
      expenses: [{ amount: 500, scope: "DROP" }],
    })
    mockedDrop.mockResolvedValue(drop as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)

    const r = await getDropFinancials("drop1")
    expect(r.totalStock).toBe(0)
    expect(r.soldPct).toBe(0) // guarded against divide-by-zero
    expect(r.maxRevenue).toBe(0) // 100 * 0
    // avgPrice = 0 (totalStock 0) → breakEvenUnits null even though expenses exist
    expect(r.breakEvenUnits).toBeNull()
  })

  it("throws when the drop is not found", async () => {
    mockedDrop.mockResolvedValue(null as never)
    mockedCash.mockResolvedValue(null as never)
    mockedDebt.mockResolvedValue([] as never)
    await expect(getDropFinancials("missing")).rejects.toThrow("Drop not found")
  })
})
