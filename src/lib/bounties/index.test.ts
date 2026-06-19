import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock de prisma: solo los modelos/métodos que usa src/lib/bounties.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversion: { aggregate: vi.fn() },
    bounty: { findMany: vi.fn() },
    bountyAchievement: { findMany: vi.fn(), create: vi.fn() },
  },
}))

// Mock del logger para no ensuciar la salida y poder assert sobre errores.
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  progressForMetric,
  rewardLabel,
  getCampaignProgress,
  evaluateBounties,
  type CampaignProgress,
} from "./index"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// progressForMetric — función pura
// ---------------------------------------------------------------------------
describe("progressForMetric", () => {
  const progress: CampaignProgress = { salesCount: 7, revenue: 12345 }

  it("devuelve revenue cuando la métrica es REVENUE", () => {
    expect(progressForMetric(progress, "REVENUE")).toBe(12345)
  })

  it("devuelve salesCount cuando la métrica es SALES", () => {
    expect(progressForMetric(progress, "SALES")).toBe(7)
  })

  it("trata cualquier métrica no-REVENUE como salesCount", () => {
    // La impl usa: metric === "REVENUE" ? revenue : salesCount
    expect(progressForMetric(progress, "SALES")).toBe(progress.salesCount)
  })

  it("maneja valores en cero", () => {
    const zero: CampaignProgress = { salesCount: 0, revenue: 0 }
    expect(progressForMetric(zero, "REVENUE")).toBe(0)
    expect(progressForMetric(zero, "SALES")).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// rewardLabel — función pura
// ---------------------------------------------------------------------------
describe("rewardLabel", () => {
  const base = {
    rewardType: "CASH" as const,
    rewardValue: null as number | null,
    rewardProductName: null as string | null,
    rewardDescription: null as string | null,
  }

  it("formatea CASH con currency por defecto (ARS) cuando hay rewardValue", () => {
    const label = rewardLabel({ ...base, rewardType: "CASH", rewardValue: 5000 })
    expect(label).toContain("en efectivo")
    expect(label).toContain("5.000") // formato es-AR usa punto como separador de miles
  })

  it("formatea CASH respetando una currency explícita", () => {
    const label = rewardLabel({
      ...base,
      rewardType: "CASH",
      rewardValue: 100,
      currency: "USD",
    })
    expect(label).toContain("en efectivo")
    // El símbolo exacto varía por ICU, pero el monto debe estar presente.
    expect(label).toContain("100")
  })

  it("CASH sin rewardValue cae al ramo de descripción/genérico", () => {
    const label = rewardLabel({ ...base, rewardType: "CASH", rewardValue: null })
    // No es producto, no hay descripción => 'Recompensa'
    expect(label).toBe("Recompensa")
  })

  it("PRODUCT usa rewardProductName cuando existe", () => {
    const label = rewardLabel({
      ...base,
      rewardType: "PRODUCT",
      rewardProductName: "Remera Kool",
    })
    expect(label).toBe("Remera Kool")
  })

  it("PRODUCT cae a rewardDescription si no hay nombre", () => {
    const label = rewardLabel({
      ...base,
      rewardType: "PRODUCT",
      rewardProductName: null,
      rewardDescription: "Algún producto",
    })
    expect(label).toBe("Algún producto")
  })

  it("PRODUCT sin nombre ni descripción usa el genérico de producto", () => {
    const label = rewardLabel({ ...base, rewardType: "PRODUCT" })
    expect(label).toBe("Producto de regalo")
  })

  it("otros rewardType usan rewardDescription cuando existe", () => {
    const label = rewardLabel({
      ...base,
      rewardType: "OTHER" as never,
      rewardDescription: "Sorteo especial",
    })
    expect(label).toBe("Sorteo especial")
  })

  it("otros rewardType sin descripción usan el genérico 'Recompensa'", () => {
    const label = rewardLabel({ ...base, rewardType: "OTHER" as never })
    expect(label).toBe("Recompensa")
  })
})

// ---------------------------------------------------------------------------
// getCampaignProgress — agrega desde prisma.conversion
// ---------------------------------------------------------------------------
describe("getCampaignProgress", () => {
  it("mapea _count._all -> salesCount y _sum.orderAmount -> revenue", async () => {
    vi.mocked(prisma.conversion.aggregate).mockResolvedValue({
      _count: { _all: 3 },
      _sum: { orderAmount: 4500 },
    } as never)

    const result = await getCampaignProgress("creator-1", "campaign-1")

    expect(result).toEqual({ salesCount: 3, revenue: 4500 })
    expect(prisma.conversion.aggregate).toHaveBeenCalledWith({
      where: { creatorId: "creator-1", campaignId: "campaign-1" },
      _count: { _all: true },
      _sum: { orderAmount: true },
    })
  })

  it("usa 0 cuando _sum.orderAmount es null (sin ventas)", async () => {
    vi.mocked(prisma.conversion.aggregate).mockResolvedValue({
      _count: { _all: 0 },
      _sum: { orderAmount: null },
    } as never)

    const result = await getCampaignProgress("creator-1", "campaign-1")
    expect(result).toEqual({ salesCount: 0, revenue: 0 })
  })
})

// ---------------------------------------------------------------------------
// evaluateBounties — lógica de decisión de tiers (con prisma mockeado)
// ---------------------------------------------------------------------------
describe("evaluateBounties", () => {
  function setProgress(salesCount: number, revenue: number) {
    vi.mocked(prisma.conversion.aggregate).mockResolvedValue({
      _count: { _all: salesCount },
      _sum: { orderAmount: revenue },
    } as never)
  }

  function setBounties(bounties: unknown[]) {
    vi.mocked(prisma.bounty.findMany).mockResolvedValue(bounties as never)
  }

  function setExistingAchievements(tierIds: string[]) {
    vi.mocked(prisma.bountyAchievement.findMany).mockResolvedValue(
      tierIds.map((tierId) => ({ tierId })) as never
    )
  }

  function makeBounty(over: Record<string, unknown> = {}) {
    return {
      id: "bounty-1",
      name: "Ventas Q1",
      metric: "SALES",
      status: "ACTIVE",
      tiers: [],
      ...over,
    }
  }

  function makeTier(over: Record<string, unknown> = {}) {
    return {
      id: "tier-1",
      threshold: 5,
      rewardType: "CASH",
      rewardValue: 1000,
      rewardProductName: null,
      rewardDescription: null,
      ...over,
    }
  }

  beforeEach(() => {
    // create devuelve un achievement con id por defecto.
    vi.mocked(prisma.bountyAchievement.create).mockImplementation(((args: {
      data: Record<string, unknown>
    }) => Promise.resolve({ id: "ach-new", ...args.data })) as never)
  })

  it("devuelve [] si no hay bounties activos (corta antes de consultar progreso)", async () => {
    setBounties([])

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toEqual([])
    expect(prisma.conversion.aggregate).not.toHaveBeenCalled()
    expect(prisma.bountyAchievement.create).not.toHaveBeenCalled()
  })

  it("no crea achievement si el progreso está por debajo del primer tier", async () => {
    setBounties([makeBounty({ tiers: [makeTier({ id: "t1", threshold: 5 })] })])
    setExistingAchievements([])
    setProgress(3, 0) // 3 < 5

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toEqual([])
    expect(prisma.bountyAchievement.create).not.toHaveBeenCalled()
  })

  it("crea achievement cuando el valor es exactamente igual al umbral (>=)", async () => {
    setBounties([makeBounty({ tiers: [makeTier({ id: "t1", threshold: 5 })] })])
    setExistingAchievements([])
    setProgress(5, 0) // 5 >= 5

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      bountyId: "bounty-1",
      bountyName: "Ventas Q1",
      metric: "SALES",
      threshold: 5,
      rewardType: "CASH",
    })
    expect(prisma.bountyAchievement.create).toHaveBeenCalledTimes(1)
    expect(prisma.bountyAchievement.create).toHaveBeenCalledWith({
      data: {
        bountyId: "bounty-1",
        tierId: "t1",
        creatorId: "creator-1",
        progressValue: 5,
        status: "ACHIEVED",
      },
    })
  })

  it("alcanza múltiples tiers a la vez cuando el valor supera varios umbrales", async () => {
    setBounties([
      makeBounty({
        tiers: [
          makeTier({ id: "t1", threshold: 5 }),
          makeTier({ id: "t2", threshold: 10 }),
          makeTier({ id: "t3", threshold: 20 }),
        ],
      }),
    ])
    setExistingAchievements([])
    setProgress(12, 0) // alcanza t1 (5) y t2 (10), pero no t3 (20)

    const result = await evaluateBounties("creator-1", "campaign-1")

    const tierThresholds = result.map((r) => r.threshold).sort((a, b) => a - b)
    expect(tierThresholds).toEqual([5, 10])
    expect(prisma.bountyAchievement.create).toHaveBeenCalledTimes(2)
  })

  it("no recrea tiers ya logrados (idempotencia)", async () => {
    setBounties([
      makeBounty({
        tiers: [makeTier({ id: "t1", threshold: 5 }), makeTier({ id: "t2", threshold: 10 })],
      }),
    ])
    setExistingAchievements(["t1"]) // t1 ya estaba logrado
    setProgress(15, 0) // supera ambos

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toHaveLength(1)
    expect(result[0].threshold).toBe(10) // solo el nuevo (t2)
    expect(prisma.bountyAchievement.create).toHaveBeenCalledTimes(1)
  })

  it("usa la métrica REVENUE para evaluar umbrales de revenue", async () => {
    setBounties([
      makeBounty({
        metric: "REVENUE",
        tiers: [makeTier({ id: "t1", threshold: 10000 })],
      }),
    ])
    setExistingAchievements([])
    setProgress(1, 12000) // salesCount=1 (< umbral si fuera SALES) pero revenue=12000 >= 10000

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toHaveLength(1)
    expect(result[0].metric).toBe("REVENUE")
    expect(prisma.bountyAchievement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progressValue: 12000 }),
      })
    )
  })

  it("evalúa múltiples bounties de la misma campaña de forma independiente", async () => {
    setBounties([
      makeBounty({
        id: "b-sales",
        name: "Ventas",
        metric: "SALES",
        tiers: [makeTier({ id: "ts", threshold: 5 })],
      }),
      makeBounty({
        id: "b-rev",
        name: "Revenue",
        metric: "REVENUE",
        tiers: [makeTier({ id: "tr", threshold: 100000 })],
      }),
    ])
    setExistingAchievements([])
    setProgress(6, 50000) // cumple sales (6>=5) pero no revenue (50000<100000)

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toHaveLength(1)
    expect(result[0].bountyId).toBe("b-sales")
  })

  it("ignora silenciosamente el error P2002 (carrera de webhooks) sin loguear", async () => {
    setBounties([makeBounty({ tiers: [makeTier({ id: "t1", threshold: 5 })] })])
    setExistingAchievements([])
    setProgress(10, 0)
    vi.mocked(prisma.bountyAchievement.create).mockRejectedValue({ code: "P2002" })

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toEqual([]) // el achievement no se agrega al resultado
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("loguea otros errores de create distintos a P2002", async () => {
    setBounties([makeBounty({ tiers: [makeTier({ id: "t1", threshold: 5 })] })])
    setExistingAchievements([])
    setProgress(10, 0)
    vi.mocked(prisma.bountyAchievement.create).mockRejectedValue({ code: "P2003" })

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result).toEqual([])
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it("propaga el reward formateado (rewardLabel) en el achievement devuelto", async () => {
    setBounties([
      makeBounty({
        tiers: [
          makeTier({
            id: "t1",
            threshold: 5,
            rewardType: "PRODUCT",
            rewardValue: null,
            rewardProductName: "Gift Box",
          }),
        ],
      }),
    ])
    setExistingAchievements([])
    setProgress(5, 0)

    const result = await evaluateBounties("creator-1", "campaign-1")

    expect(result[0].reward).toBe("Gift Box")
  })
})
