import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }))

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://app.kool.co" },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspaceMember: { findFirst: vi.fn() },
    workspace: { findUnique: vi.fn() },
    creator: { findMany: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn() },
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
  return new NextRequest("http://localhost/api/creators/import", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const body = (rows: unknown[]) => ({ workspaceId: "w1", creators: rows })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never)
  vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ id: "m1" } as never)
  vi.mocked(prisma.workspace.findUnique).mockResolvedValue({ name: "Acme" } as never)
  vi.mocked(prisma.creator.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.user.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.creator.create).mockResolvedValue({ id: "cr1" } as never)
})

describe("POST /api/creators/import", () => {
  it("invita (manda mail) a creators sin cuenta", async () => {
    const res = await POST(req(body([{ email: "ana@mail.com", name: "Ana", commissionPct: 10 }])))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.invited).toBe(1)
    expect(sendCreatorInvite).toHaveBeenCalledTimes(1)
    expect(sendCreatorInvite).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ana@mail.com", creatorName: "Ana", brandName: "Acme" })
    )
  })

  it("NO manda mail a creators con cuenta existente (import directo)", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u9", email: "ana@mail.com", name: "Ana" },
    ] as never)
    const res = await POST(req(body([{ email: "ana@mail.com", name: "Ana", commissionPct: 10 }])))
    const json = await res.json()
    expect(json.imported).toBe(1)
    expect(json.invited).toBe(0)
    expect(sendCreatorInvite).not.toHaveBeenCalled()
  })

  it("NO manda mail a creators que ya están en el workspace (skip)", async () => {
    vi.mocked(prisma.creator.findMany).mockResolvedValue([{ email: "ana@mail.com" }] as never)
    const res = await POST(req(body([{ email: "ana@mail.com", name: "Ana", commissionPct: 10 }])))
    const json = await res.json()
    expect(json.skipped).toBe(1)
    expect(sendCreatorInvite).not.toHaveBeenCalled()
  })

  it("403 y no manda mail si no es miembro del workspace", async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null as never)
    const res = await POST(req(body([{ email: "ana@mail.com", name: "Ana", commissionPct: 10 }])))
    expect(res.status).toBe(403)
    expect(sendCreatorInvite).not.toHaveBeenCalled()
  })
})
