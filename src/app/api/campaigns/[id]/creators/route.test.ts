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
    tiendanubeConnection: { findUnique: vi.fn() },
    creator: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    campaignCreator: { upsert: vi.fn() },
    campaignInvite: { upsert: vi.fn() },
    link: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

vi.mock("@/lib/tiendanube", () => ({ createTiendanubeCoupon: vi.fn() }))
vi.mock("@/lib/utils/crypto", () => ({ decrypt: vi.fn(() => "token") }))

vi.mock("@/lib/email", () => ({
  sendCampaignInviteExisting: vi.fn().mockResolvedValue({ ok: true }),
  sendCampaignInviteNew: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "./route"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendCampaignInviteExisting, sendCampaignInviteNew } from "@/lib/email"

const ctx = { params: Promise.resolve({ id: "c1" }) }

function req(body: unknown) {
  return new NextRequest("http://localhost/api/campaigns/c1/creators", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

const inviteBody = {
  firstName: "Ana",
  lastName: "Lopez",
  email: "ana@mail.com",
  commissionPct: 20,
  discountCode: "ANA20",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: "u1" } as never)
  vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
    id: "c1",
    name: "Verano",
    workspaceId: "w1",
    workspace: { name: "Acme" },
  } as never)
  vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ id: "m1" } as never)
  vi.mocked(prisma.tiendanubeConnection.findUnique).mockResolvedValue(null as never)
  vi.mocked(prisma.campaignCreator.upsert).mockResolvedValue({} as never)
  vi.mocked(prisma.campaignInvite.upsert).mockResolvedValue({} as never)
})

describe("POST campaigns/[id]/creators — invite by email", () => {
  it("creator nuevo (sin cuenta) → sendCampaignInviteNew con registerUrl", async () => {
    vi.mocked(prisma.creator.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.creator.create).mockResolvedValue({ id: "cr1", userId: null } as never)

    const res = await POST(req(inviteBody), ctx)
    expect(res.status).toBe(200)
    expect(sendCampaignInviteNew).toHaveBeenCalledTimes(1)
    expect(sendCampaignInviteNew).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@mail.com",
        creatorName: "Ana",
        brandName: "Acme",
        campaignName: "Verano",
        discountCode: "ANA20",
        commissionPct: 20,
        registerUrl: expect.stringContaining("https://app.kool.co/register?token="),
      })
    )
    expect(sendCampaignInviteExisting).not.toHaveBeenCalled()
  })

  it("creator existente (con cuenta) → sendCampaignInviteExisting con dashboardUrl", async () => {
    vi.mocked(prisma.creator.findFirst).mockResolvedValue({ id: "cr1", userId: "u9" } as never)
    vi.mocked(prisma.creator.update).mockResolvedValue({ id: "cr1", userId: "u9" } as never)

    const res = await POST(req(inviteBody), ctx)
    expect(res.status).toBe(200)
    expect(sendCampaignInviteExisting).toHaveBeenCalledTimes(1)
    expect(sendCampaignInviteExisting).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ana@mail.com", brandName: "Acme", campaignName: "Verano" })
    )
    expect(sendCampaignInviteNew).not.toHaveBeenCalled()
  })

  it("401 sin auth, no mail", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const res = await POST(req(inviteBody), ctx)
    expect(res.status).toBe(401)
    expect(sendCampaignInviteNew).not.toHaveBeenCalled()
  })

  it("403 sin acceso, no mail", async () => {
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(null as never)
    const res = await POST(req(inviteBody), ctx)
    expect(res.status).toBe(403)
    expect(sendCampaignInviteNew).not.toHaveBeenCalled()
  })
})
