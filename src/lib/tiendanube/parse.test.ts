import { describe, it, expect } from "vitest"
import { parseTiendanubeOrderWebhook } from "./index"

// Estructura REAL de una orden de Tiendanube (verificada contra GET /orders):
// el cupón aplicado viene en `order.coupon` (array), NO en `promotional_discount.code`.
const baseOrder = {
  id: 2007013049,
  number: 105,
  total: "90.00",
  currency: "ARS",
  created_at: "2026-06-30T14:00:00+00:00",
  paid_at: "2026-06-30T14:01:00+00:00",
  products: [],
} as never

describe("parseTiendanubeOrderWebhook — extracción de creatorCode", () => {
  it("toma el código del cupón aplicado desde order.coupon[].code", () => {
    const order = {
      ...(baseOrder as object),
      coupon: [{ id: 63450388, code: "TOBINHO10", type: "percentage", value: "10.00" }],
      promotional_discount: {
        id: null,
        total_discount_amount: "0.00",
        contents: [],
        promotions_applied: [],
      },
      utm_parameters: null,
    } as never

    const parsed = parseTiendanubeOrderWebhook(order)
    expect(parsed.creatorCode).toBe("TOBINHO10")
  })

  it("sin cupón ni utm → creatorCode null", () => {
    const order = {
      ...(baseOrder as object),
      coupon: [],
      promotional_discount: {
        id: null,
        total_discount_amount: "0.00",
        contents: [],
        promotions_applied: [],
      },
      utm_parameters: null,
    } as never

    const parsed = parseTiendanubeOrderWebhook(order)
    expect(parsed.creatorCode).toBeNull()
  })

  it("fallback a utm_campaign cuando no hay cupón", () => {
    const order = {
      ...(baseOrder as object),
      coupon: [],
      utm_parameters: { campaign: "ana20", source: "ig", medium: "social", content: "ana-verano" },
    } as never

    const parsed = parseTiendanubeOrderWebhook(order)
    expect(parsed.creatorCode).toBe("ANA20")
    expect(parsed.linkSlug).toBe("ana-verano")
  })
})
