import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn() }))

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://app.kool.co" },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creator: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    user: { upsert: vi.fn() },
    campaignInvite: { updateMany: vi.fn() },
    campaignCreator: { updateMany: vi.fn() },
  },
}))

vi.mock("@/lib/email", () => ({
  sendWelcomeCreator: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "./route"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendWelcomeCreator } from "@/lib/email"

function req(body: unknown) {
  return new NextRequest("http://localhost/api/onboarding/creator", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never)
  vi.mocked(currentUser).mockResolvedValue({
    emailAddresses: [{ emailAddress: "ana@mail.com" }],
    firstName: "Ana",
    lastName: "Lopez",
  } as never)
  vi.mocked(prisma.creator.findFirst).mockResolvedValue({ id: "cr1" } as never)
  vi.mocked(prisma.user.upsert).mockResolvedValue({} as never)
  vi.mocked(prisma.creator.update).mockResolvedValue({
    id: "cr1",
    email: "ana@mail.com",
    firstName: "Ana",
    name: "Ana Lopez",
    discountCode: "ANA10",
    commissionPct: 12,
    workspace: { name: "Acme" },
  } as never)
  vi.mocked(prisma.creator.create).mockResolvedValue({
    id: "cr-new",
    email: "ana@mail.com",
    firstName: "Ana",
    name: "Ana Lopez",
    discountCode: null,
    commissionPct: 10,
    workspace: null,
  } as never)
  vi.mocked(prisma.campaignInvite.updateMany).mockResolvedValue({} as never)
  vi.mocked(prisma.campaignCreator.updateMany).mockResolvedValue({} as never)
})

describe("POST /api/onboarding/creator", () => {
  it("activa el perfil y manda mail de bienvenida con dashboardUrl del creator", async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    expect(sendWelcomeCreator).toHaveBeenCalledTimes(1)
    expect(sendWelcomeCreator).toHaveBeenCalledWith({
      to: "ana@mail.com",
      creatorName: "Ana",
      brandName: "Acme",
      discountCode: "ANA10",
      commissionPct: 12,
      dashboardUrl: "https://app.kool.co/creator",
    })
  })

  it("NO manda mail si el creator no tiene email", async () => {
    vi.mocked(prisma.creator.update).mockResolvedValue({
      id: "cr1",
      email: null,
      workspace: { name: "Acme" },
    } as never)
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    expect(sendWelcomeCreator).not.toHaveBeenCalled()
  })

  it("401 sin auth, no mail", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const res = await POST(req({}))
    expect(res.status).toBe(401)
    expect(sendWelcomeCreator).not.toHaveBeenCalled()
  })

  it("sin token y sin creator previo → crea self-serve (sin marca) y responde 200", async () => {
    vi.mocked(prisma.creator.findFirst).mockResolvedValue(null as never)
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    expect(prisma.creator.create).toHaveBeenCalledTimes(1)
    expect(prisma.creator.update).not.toHaveBeenCalled()
    // self-serve sin marca → mail con fallback de brand, sin discountCode
    expect(sendWelcomeCreator).toHaveBeenCalledTimes(1)
  })

  it("token inválido → 404, no crea ni manda mail", async () => {
    vi.mocked(prisma.creator.findUnique).mockResolvedValue(null as never)
    const res = await POST(req({ token: "bad-token" }))
    expect(res.status).toBe(404)
    expect(prisma.creator.create).not.toHaveBeenCalled()
    expect(prisma.creator.update).not.toHaveBeenCalled()
    expect(sendWelcomeCreator).not.toHaveBeenCalled()
  })
})
