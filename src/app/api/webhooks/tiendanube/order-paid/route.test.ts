import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/tiendanube", () => ({
  parseTiendanubeOrderWebhook: vi.fn(),
  verifyTiendanubeWebhookSignature: vi.fn(),
  getTiendanubeOrder: vi.fn(),
}))

vi.mock("@/lib/utils/crypto", () => ({ decrypt: vi.fn(() => "token") }))

vi.mock("@/lib/drops/sales", () => ({ getSaleRealStatus: vi.fn(() => "ENDED") }))

vi.mock("@/lib/bounties", () => ({ evaluateBounties: vi.fn() }))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversion: { findFirst: vi.fn() },
    tiendanubeConnection: { findFirst: vi.fn() },
    campaignCreator: { findFirst: vi.fn() },
    creator: { findFirst: vi.fn() },
    link: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/email", () => ({
  sendSaleGenerated: vi.fn().mockResolvedValue({ ok: true }),
  sendBountyAchieved: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "./route"
import { prisma } from "@/lib/prisma"
import {
  parseTiendanubeOrderWebhook,
  verifyTiendanubeWebhookSignature,
  getTiendanubeOrder,
} from "@/lib/tiendanube"
import { evaluateBounties } from "@/lib/bounties"
import { sendSaleGenerated, sendBountyAchieved } from "@/lib/email"

function req(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/tiendanube/order-paid", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-linkedstore-hmac-sha256": "sig" },
  })
}

const orderBody = { id: "order_1", store_id: 123, total: "10000" }

// tx mock: el callback de $transaction recibe esto.
const tx = {
  conversion: { create: vi.fn() },
  commission: { create: vi.fn() },
  dropProduct: { findFirst: vi.fn() },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTiendanubeWebhookSignature).mockReturnValue(true)
  vi.mocked(getTiendanubeOrder).mockResolvedValue(orderBody as never)
  vi.mocked(parseTiendanubeOrderWebhook).mockReturnValue({
    creatorCode: "ANA20",
    orderId: "order_1",
    orderAmount: 10000,
    currency: "ARS",
    orderDate: new Date("2026-01-01"),
    couponApplied: true,
  } as never)
  vi.mocked(prisma.conversion.findFirst).mockResolvedValue(null as never)
  vi.mocked(prisma.tiendanubeConnection.findFirst).mockResolvedValue({
    workspaceId: "w1",
    workspace: { name: "Acme" },
  } as never)
  vi.mocked(prisma.campaignCreator.findFirst).mockResolvedValue({
    commissionPct: 20,
    campaignId: "camp1",
    creator: { id: "cr1", email: "ana@mail.com", name: "Ana", firstName: "Ana", commissionPct: 10 },
    campaign: { id: "camp1" },
  } as never)
  vi.mocked(prisma.link.findFirst).mockResolvedValue(null as never)
  vi.mocked(evaluateBounties).mockResolvedValue([] as never)
  tx.conversion.create.mockResolvedValue({ id: "conv1" })
  tx.commission.create.mockResolvedValue({ id: "com1" })
  vi.mocked(prisma.$transaction).mockImplementation(((cb: (t: typeof tx) => unknown) =>
    Promise.resolve(cb(tx))) as never)
})

describe("POST webhook order/paid — venta atribuida", () => {
  it("registra conversión + comisión y manda 'venta generada' (comisión = 20%)", async () => {
    const res = await POST(req(orderBody))
    const json = await res.json()
    expect(json.attributed).toBe(true)

    expect(tx.conversion.create).toHaveBeenCalledTimes(1)
    expect(tx.commission.create).toHaveBeenCalledTimes(1)

    expect(sendSaleGenerated).toHaveBeenCalledTimes(1)
    expect(sendSaleGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@mail.com",
        creatorName: "Ana",
        brandName: "Acme",
        orderAmount: 10000,
        commissionAmount: 2000,
        currency: "ARS",
      })
    )
  })

  it("manda 'bounty achieved' por cada tier recién alcanzado", async () => {
    vi.mocked(evaluateBounties).mockResolvedValue([
      { bountyName: "10 ventas", reward: "Kit premium" },
    ] as never)

    await POST(req(orderBody))
    expect(sendBountyAchieved).toHaveBeenCalledTimes(1)
    expect(sendBountyAchieved).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@mail.com",
        brandName: "Acme",
        bountyName: "10 ventas",
        reward: "Kit premium",
      })
    )
    expect(sendSaleGenerated).toHaveBeenCalledTimes(1)
  })
})

describe("POST webhook order/paid — sin envío de mail", () => {
  it("firma inválida → 401, no procesa ni manda mail", async () => {
    vi.mocked(verifyTiendanubeWebhookSignature).mockReturnValue(false)
    const res = await POST(req(orderBody))
    expect(res.status).toBe(401)
    expect(sendSaleGenerated).not.toHaveBeenCalled()
  })

  it("orden duplicada → no manda mail", async () => {
    vi.mocked(prisma.conversion.findFirst).mockResolvedValue({ id: "dup" } as never)
    const res = await POST(req(orderBody))
    const json = await res.json()
    expect(json.duplicate).toBe(true)
    expect(sendSaleGenerated).not.toHaveBeenCalled()
  })

  it("sin creator code → no atribuye ni manda mail", async () => {
    vi.mocked(parseTiendanubeOrderWebhook).mockReturnValue({
      creatorCode: null,
      orderId: "order_1",
      orderAmount: 10000,
      currency: "ARS",
      orderDate: new Date("2026-01-01"),
    } as never)
    const res = await POST(req(orderBody))
    const json = await res.json()
    expect(json.attributed).toBe(false)
    expect(sendSaleGenerated).not.toHaveBeenCalled()
  })

  it("creator no encontrado → no manda mail", async () => {
    vi.mocked(prisma.campaignCreator.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.creator.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.link.findFirst).mockResolvedValue(null as never)
    const res = await POST(req(orderBody))
    const json = await res.json()
    expect(json.attributed).toBe(false)
    expect(sendSaleGenerated).not.toHaveBeenCalled()
  })
})

describe("POST webhook order/paid — atribución por link sin cupón", () => {
  // Venta sin cupón: el link llega por customer_visit (parse devuelve linkSlug,
  // creatorCode null, couponApplied false). El creator sale del link.
  beforeEach(() => {
    vi.mocked(parseTiendanubeOrderWebhook).mockReturnValue({
      creatorCode: null,
      linkSlug: "tobilv",
      couponApplied: false,
      orderId: "order_1",
      orderAmount: 10000,
      currency: "ARS",
      orderDate: new Date("2026-01-01"),
    } as never)
    vi.mocked(prisma.campaignCreator.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.creator.findFirst).mockResolvedValue(null as never)
  })

  it("link con creator + flag ON → conversión + comisión", async () => {
    vi.mocked(prisma.link.findFirst).mockResolvedValue({
      id: "lnk1",
      creatorId: "cr1",
      campaignId: null,
      commissionWithoutCoupon: true,
      creator: {
        id: "cr1",
        email: "tobi@mail.com",
        name: "Tobi",
        firstName: "Tobi",
        commissionPct: 10,
      },
    } as never)

    const res = await POST(req(orderBody))
    const json = await res.json()
    expect(json.attributed).toBe(true)
    expect(tx.conversion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ linkId: "lnk1", creatorId: "cr1" }),
      })
    )
    expect(tx.commission.create).toHaveBeenCalledTimes(1)
  })

  it("link con creator + flag OFF → conversión SIN comisión", async () => {
    vi.mocked(prisma.link.findFirst).mockResolvedValue({
      id: "lnk1",
      creatorId: "cr1",
      campaignId: null,
      commissionWithoutCoupon: false,
      creator: {
        id: "cr1",
        email: "tobi@mail.com",
        name: "Tobi",
        firstName: "Tobi",
        commissionPct: 10,
      },
    } as never)

    const res = await POST(req(orderBody))
    const json = await res.json()
    expect(json.attributed).toBe(true)
    expect(tx.conversion.create).toHaveBeenCalledTimes(1)
    expect(tx.commission.create).not.toHaveBeenCalled()
  })

  it("link sin creator → conversión atribuida al link, sin comisión", async () => {
    vi.mocked(prisma.link.findFirst).mockResolvedValue({
      id: "lnk1",
      creatorId: null,
      campaignId: null,
      commissionWithoutCoupon: false,
      creator: null,
    } as never)

    const res = await POST(req(orderBody))
    const json = await res.json()
    expect(json.attributed).toBe(true)
    expect(tx.conversion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ linkId: "lnk1" }) })
    )
    expect(tx.commission.create).not.toHaveBeenCalled()
  })
})
