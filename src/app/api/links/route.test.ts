import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    link: { findUnique: vi.fn(), create: vi.fn() },
    campaignCreator: { findUnique: vi.fn() },
    creator: { findUnique: vi.fn() },
    tiendanubeConnection: { findUnique: vi.fn() },
  },
}))

vi.mock("@/lib/tiendanube", () => ({ createTiendanubeCoupon: vi.fn() }))
vi.mock("@/lib/utils/crypto", () => ({ decrypt: vi.fn(() => "token") }))
vi.mock("@/lib/utils", () => ({
  slugify: vi.fn(() => "mi-link"),
  generateDiscountCode: vi.fn(() => "CODE"),
}))
vi.mock("@/lib/api/response", () => ({
  handleError: vi.fn(() => new Response("err", { status: 500 })),
}))

import { POST } from "./route"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

function req(body: unknown) {
  return new NextRequest("http://localhost/api/links", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never)
  vi.mocked(prisma.link.findUnique).mockResolvedValue(null as never)
  vi.mocked(prisma.link.create).mockResolvedValue({ id: "lnk1", slug: "mi-link" } as never)
  vi.mocked(prisma.tiendanubeConnection.findUnique).mockResolvedValue(null as never)
})

describe("POST /api/links — commissionWithoutCoupon", () => {
  it("persiste commissionWithoutCoupon=true cuando se envía", async () => {
    await POST(
      req({ workspaceId: "w1", destination: "https://tienda.com", commissionWithoutCoupon: true })
    )
    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ commissionWithoutCoupon: true }) })
    )
  })

  it("default false cuando se omite", async () => {
    await POST(req({ workspaceId: "w1", destination: "https://tienda.com" }))
    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ commissionWithoutCoupon: false }) })
    )
  })
})
