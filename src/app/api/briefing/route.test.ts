import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspaceMember: { findFirst: vi.fn() },
    workspace: { findUnique: vi.fn() },
    briefing: { create: vi.fn() },
    briefingRecipient: { update: vi.fn() },
  },
}))

vi.mock("@/lib/email", () => ({
  sendBriefing: vi.fn().mockResolvedValue({ ok: true, id: "e_1" }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "./route"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendBriefing } from "@/lib/email"

function req(body: unknown) {
  return new NextRequest("http://localhost/api/briefing", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const base = {
  workspaceId: "w1",
  subject: "Hola",
  body: "Linea 1\nLinea 2",
  campaignName: "Verano",
  startDate: "01/07",
  endDate: "31/07",
  creatorIds: ["cr1"],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never)
  vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ id: "m1" } as never)
  vi.mocked(prisma.workspace.findUnique).mockResolvedValue({ name: "Acme" } as never)
  vi.mocked(prisma.briefing.create).mockResolvedValue({
    id: "b1",
    recipients: [{ id: "r1", creator: { email: "ana@mail.com", name: "Ana" } }],
  } as never)
})

describe("POST /api/briefing", () => {
  it("manda el briefing a cada recipient cuando send=true y convierte \\n a <br>", async () => {
    const res = await POST(req({ ...base, send: true }))
    expect(res.status).toBe(200)
    expect(sendBriefing).toHaveBeenCalledTimes(1)
    expect(sendBriefing).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@mail.com",
        creatorName: "Ana",
        brandName: "Acme",
        campaignName: "Verano",
        briefingHtml: "<p>Linea 1<br>Linea 2</p>",
        startDate: "01/07",
        endDate: "31/07",
      })
    )
    expect(prisma.briefingRecipient.update).toHaveBeenCalledTimes(1)
  })

  it("NO manda mail cuando send=false (solo guarda draft)", async () => {
    const res = await POST(req({ ...base, send: false }))
    expect(res.status).toBe(200)
    expect(sendBriefing).not.toHaveBeenCalled()
  })

  it("403 y no manda mail si no es miembro del workspace", async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null as never)
    const res = await POST(req({ ...base, send: true }))
    expect(res.status).toBe(403)
    expect(sendBriefing).not.toHaveBeenCalled()
  })

  it("401 sin auth", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const res = await POST(req({ ...base, send: true }))
    expect(res.status).toBe(401)
    expect(sendBriefing).not.toHaveBeenCalled()
  })
})
