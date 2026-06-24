import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }))

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://app.kool.co" },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    workspaceMember: { findFirst: vi.fn() },
    application: { findUnique: vi.fn(), update: vi.fn() },
    creator: { findFirst: vi.fn(), create: vi.fn() },
    campaignCreator: { upsert: vi.fn() },
  },
}))

vi.mock("@/lib/email", () => ({
  sendApplicationAccepted: vi.fn().mockResolvedValue({ ok: true }),
  sendApplicationAcceptedExisting: vi.fn().mockResolvedValue({ ok: true }),
  sendApplicationRejected: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { PATCH } from "./route"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import {
  sendApplicationAccepted,
  sendApplicationAcceptedExisting,
  sendApplicationRejected,
} from "@/lib/email"

const ctx = { params: Promise.resolve({ id: "c1", applicationId: "app1" }) }

function req(body: unknown) {
  return new NextRequest("http://localhost/api/campaigns/c1/applications/app1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never)
  vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
    id: "c1",
    name: "Verano",
    workspaceId: "w1",
    workspace: { id: "w1", name: "Acme" },
  } as never)
  vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ id: "m1" } as never)
  vi.mocked(prisma.application.findUnique).mockResolvedValue({
    id: "app1",
    campaignId: "c1",
    email: "ana@mail.com",
    name: "Ana",
  } as never)
  vi.mocked(prisma.application.update).mockResolvedValue({ id: "app1" } as never)
  vi.mocked(prisma.campaignCreator.upsert).mockResolvedValue({} as never)
})

describe("PATCH applications — ACCEPTED", () => {
  it("creator nuevo (sin cuenta) → mail 'aceptado, creá cuenta' con registerUrl", async () => {
    vi.mocked(prisma.creator.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.creator.create).mockResolvedValue({ id: "cr1", userId: null } as never)

    const res = await PATCH(req({ status: "ACCEPTED" }), ctx)
    expect(res.status).toBe(200)
    expect(sendApplicationAccepted).toHaveBeenCalledTimes(1)
    expect(sendApplicationAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@mail.com",
        applicantName: "Ana",
        campaignName: "Verano",
        brandName: "Acme",
        registerUrl: expect.stringContaining("ana%40mail.com"),
      })
    )
    expect(sendApplicationAcceptedExisting).not.toHaveBeenCalled()
  })

  it("creator existente (con cuenta) → mail 'aceptado' con dashboardUrl", async () => {
    vi.mocked(prisma.creator.findFirst).mockResolvedValue({ id: "cr1", userId: "u9" } as never)

    const res = await PATCH(req({ status: "ACCEPTED" }), ctx)
    expect(res.status).toBe(200)
    expect(sendApplicationAcceptedExisting).toHaveBeenCalledTimes(1)
    expect(sendApplicationAcceptedExisting).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ana@mail.com", brandName: "Acme" })
    )
    expect(sendApplicationAccepted).not.toHaveBeenCalled()
  })
})

describe("PATCH applications — REJECTED", () => {
  it("manda mail de rechazo", async () => {
    const res = await PATCH(req({ status: "REJECTED" }), ctx)
    expect(res.status).toBe(200)
    expect(sendApplicationRejected).toHaveBeenCalledTimes(1)
    expect(sendApplicationRejected).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ana@mail.com", campaignName: "Verano", brandName: "Acme" })
    )
  })
})

describe("PATCH applications — guards", () => {
  it("401 sin auth, no mail", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const res = await PATCH(req({ status: "REJECTED" }), ctx)
    expect(res.status).toBe(401)
    expect(sendApplicationRejected).not.toHaveBeenCalled()
  })

  it("403 sin acceso al workspace, no mail", async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null as never)
    const res = await PATCH(req({ status: "REJECTED" }), ctx)
    expect(res.status).toBe(403)
    expect(sendApplicationRejected).not.toHaveBeenCalled()
  })

  it("404 si la aplicación no pertenece a la campaña, no mail", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: "app1",
      campaignId: "OTRA",
      email: "ana@mail.com",
      name: "Ana",
    } as never)
    const res = await PATCH(req({ status: "REJECTED" }), ctx)
    expect(res.status).toBe(404)
    expect(sendApplicationRejected).not.toHaveBeenCalled()
  })
})
