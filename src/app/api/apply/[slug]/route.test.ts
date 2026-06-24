import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    application: { findUnique: vi.fn(), create: vi.fn() },
    applicationAnswer: { createMany: vi.fn() },
  },
}))

vi.mock("@/lib/email", () => ({
  sendApplicationConfirmation: vi.fn().mockResolvedValue({ ok: true, id: "e_1" }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "./route"
import { prisma } from "@/lib/prisma"
import { sendApplicationConfirmation } from "@/lib/email"

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) })

function req(body: unknown) {
  return new NextRequest("http://localhost/api/apply/verano", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const validBody = { name: "Ana", email: "ana@mail.com" }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/apply/[slug]", () => {
  it("crea la aplicación y dispara el mail de confirmación con los datos correctos", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp_1",
      name: "Verano",
      slug: "verano",
      formStatus: "OPEN",
      fields: {},
      workspace: { name: "Acme" },
    } as never)
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.application.create).mockResolvedValue({ id: "app_1" } as never)

    const res = await POST(req(validBody), ctx("verano"))
    expect(res.status).toBe(200)

    expect(sendApplicationConfirmation).toHaveBeenCalledTimes(1)
    expect(sendApplicationConfirmation).toHaveBeenCalledWith({
      to: "ana@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
    })
  })

  it("404 y no manda mail cuando la campaña no existe", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null as never)
    const res = await POST(req(validBody), ctx("nope"))
    expect(res.status).toBe(404)
    expect(sendApplicationConfirmation).not.toHaveBeenCalled()
  })

  it("410 y no manda mail cuando el form está CLOSED", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp_1",
      name: "Verano",
      formStatus: "CLOSED",
      fields: {},
      workspace: { name: "Acme" },
    } as never)
    const res = await POST(req(validBody), ctx("verano"))
    expect(res.status).toBe(410)
    expect(sendApplicationConfirmation).not.toHaveBeenCalled()
  })

  it("409 y no manda mail cuando ya aplicó", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp_1",
      name: "Verano",
      formStatus: "OPEN",
      fields: {},
      workspace: { name: "Acme" },
    } as never)
    vi.mocked(prisma.application.findUnique).mockResolvedValue({ id: "dup" } as never)
    const res = await POST(req(validBody), ctx("verano"))
    expect(res.status).toBe(409)
    expect(sendApplicationConfirmation).not.toHaveBeenCalled()
  })

  it("400 y no manda mail cuando faltan datos (email inválido)", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      id: "camp_1",
      name: "Verano",
      formStatus: "OPEN",
      fields: {},
      workspace: { name: "Acme" },
    } as never)
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null as never)
    const res = await POST(req({ name: "Ana", email: "no-es-email" }), ctx("verano"))
    expect(res.status).toBe(400)
    expect(sendApplicationConfirmation).not.toHaveBeenCalled()
  })
})
