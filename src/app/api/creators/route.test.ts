import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://app.kool.co" },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creator: { findUnique: vi.fn(), create: vi.fn() },
    workspace: { findUnique: vi.fn() },
  },
}))

vi.mock("@/lib/email", () => ({
  sendCreatorInvite: vi.fn().mockResolvedValue({ ok: true, id: "e_1" }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "./route"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendCreatorInvite } from "@/lib/email"

function req(body: unknown) {
  return new NextRequest("http://localhost/api/creators", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const validBody = { workspaceId: "w1", name: "Ana", email: "ana@mail.com", commissionPct: 15 }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never)
})

describe("POST /api/creators", () => {
  it("crea el creator y dispara invite con brandName del workspace + onboardingUrl con el id", async () => {
    vi.mocked(prisma.creator.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.creator.create).mockResolvedValue({ id: "cr1", name: "Ana" } as never)
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({ name: "Acme" } as never)

    const res = await POST(req(validBody))
    expect(res.status).toBe(200)

    expect(sendCreatorInvite).toHaveBeenCalledTimes(1)
    expect(sendCreatorInvite).toHaveBeenCalledWith({
      to: "ana@mail.com",
      creatorName: "Ana",
      brandName: "Acme",
      discountCode: "",
      commissionPct: 15,
      onboardingUrl: "https://app.kool.co/onboarding/creator?token=cr1",
    })
  })

  it("usa 'Kool' como brandName si el workspace no se encuentra", async () => {
    vi.mocked(prisma.creator.findUnique).mockResolvedValue(null as never)
    vi.mocked(prisma.creator.create).mockResolvedValue({ id: "cr1" } as never)
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null as never)

    await POST(req(validBody))
    expect(sendCreatorInvite).toHaveBeenCalledWith(expect.objectContaining({ brandName: "Kool" }))
  })

  it("401 y no manda mail sin auth", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const res = await POST(req(validBody))
    expect(res.status).toBe(401)
    expect(sendCreatorInvite).not.toHaveBeenCalled()
  })

  it("409 y no manda mail si el creator ya existe", async () => {
    vi.mocked(prisma.creator.findUnique).mockResolvedValue({ id: "dup" } as never)
    const res = await POST(req(validBody))
    expect(res.status).toBe(409)
    expect(sendCreatorInvite).not.toHaveBeenCalled()
  })
})
