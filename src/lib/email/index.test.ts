import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock de env: valores deterministas para FROM y la API key (sin secrets reales).
vi.mock("@/lib/env", () => ({
  env: {
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "Kool <test@kool.co>",
  },
}))

// Mock del logger para no ensuciar la salida y poder assert sobre errores.
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Mock del SDK de Resend. sendMock es la función que recibe el payload final.
// vi.hoisted: necesario porque vi.mock se hoistea por encima de las imports.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))
vi.mock("resend", () => ({
  // Clase real (no arrow) para que `new Resend()` devuelva la instancia con el mock.
  Resend: class {
    emails = { send: sendMock }
  },
}))

import {
  sendCreatorInvite,
  sendBriefing,
  sendApplicationConfirmation,
  sendApplicationAccepted,
  sendApplicationAcceptedExisting,
  sendApplicationRejected,
  sendCampaignInviteExisting,
  sendCampaignInviteNew,
  sendWelcomeCreator,
  sendSaleGenerated,
  sendBountyAchieved,
} from "./index"
import { logger } from "@/lib/logger"

const FROM = "Kool <test@kool.co>"

beforeEach(() => {
  vi.clearAllMocks()
  // Default: Resend responde OK.
  sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null })
})

// Lee el payload con el que se llamó a resend.emails.send en la última llamada.
function lastPayload() {
  expect(sendMock).toHaveBeenCalledTimes(1)
  return sendMock.mock.calls[0][0] as {
    from: string
    to: string[]
    subject: string
    html: string
    replyTo?: string
  }
}

// ---------------------------------------------------------------------------
// sendEmail (base) — comportamiento compartido, probado vía funciones públicas
// ---------------------------------------------------------------------------
describe("sendEmail (base)", () => {
  it("usa el FROM de env y envuelve un destinatario string en array", async () => {
    await sendApplicationConfirmation({
      to: "creator@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
    })
    const p = lastPayload()
    expect(p.from).toBe(FROM)
    expect(p.to).toEqual(["creator@mail.com"])
  })

  it("pasa un array de destinatarios sin envolver de nuevo", async () => {
    await sendBriefing({
      to: ["a@mail.com", "b@mail.com"],
      brandName: "Acme",
      campaignName: "Verano",
      briefingHtml: "<p>brief</p>",
    })
    expect(lastPayload().to).toEqual(["a@mail.com", "b@mail.com"])
  })

  it("devuelve { ok: true, id } cuando Resend responde sin error", async () => {
    const res = await sendApplicationConfirmation({
      to: "x@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
    })
    expect(res).toEqual({ ok: true, id: "email_123" })
  })

  it("devuelve { ok: false } y loguea cuando Resend responde con error", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "domain not verified" } })
    const res = await sendApplicationConfirmation({
      to: "x@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
    })
    expect(res.ok).toBe(false)
    expect((res as { error: unknown }).error).toEqual({ message: "domain not verified" })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it("devuelve { ok: false } y loguea cuando el SDK tira (network)", async () => {
    sendMock.mockRejectedValue(new Error("network down"))
    const res = await sendApplicationConfirmation({
      to: "x@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
    })
    expect(res.ok).toBe(false)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// sendCreatorInvite
// ---------------------------------------------------------------------------
describe("sendCreatorInvite", () => {
  const base = {
    to: "creator@mail.com",
    creatorName: "Ana",
    brandName: "Acme",
    commissionPct: 15,
    onboardingUrl: "https://kool.co/onboard/abc",
  }

  it("incluye el código de descuento y el % de comisión cuando hay discountCode", async () => {
    await sendCreatorInvite({ ...base, discountCode: "ANA10" })
    const p = lastPayload()
    expect(p.subject).toBe("Acme te invitó a su programa de creators")
    expect(p.html).toContain("ANA10")
    expect(p.html).toContain("15%")
    expect(p.html).toContain("https://kool.co/onboard/abc")
    expect(p.html).toContain("Ana")
  })

  it("omite el bloque de código cuando no hay discountCode pero muestra comisión", async () => {
    await sendCreatorInvite({ ...base })
    const p = lastPayload()
    expect(p.html).not.toContain('class="pill"')
    expect(p.html).toContain("15%")
  })
})

// ---------------------------------------------------------------------------
// sendBriefing
// ---------------------------------------------------------------------------
describe("sendBriefing", () => {
  const base = {
    to: "creator@mail.com",
    brandName: "Acme",
    campaignName: "Verano 2026",
    briefingHtml: "<p>Usá el hashtag #acme</p>",
  }

  it("arma subject y embebe el briefingHtml", async () => {
    await sendBriefing(base)
    const p = lastPayload()
    expect(p.subject).toBe("Brief de campaña: Verano 2026 — Acme")
    expect(p.html).toContain("Usá el hashtag #acme")
  })

  it("incluye fechas cuando se pasan startDate y endDate", async () => {
    await sendBriefing({ ...base, startDate: "01/07", endDate: "31/07" })
    const p = lastPayload()
    expect(p.html).toContain("01/07")
    expect(p.html).toContain("31/07")
  })

  it("propaga replyTo al payload", async () => {
    await sendBriefing({ ...base, replyTo: "marca@acme.com" })
    expect(lastPayload().replyTo).toBe("marca@acme.com")
  })

  it("incluye el saludo cuando hay creatorName", async () => {
    await sendBriefing({ ...base, creatorName: "Ana" })
    expect(lastPayload().html).toContain("Hola Ana")
  })
})

// ---------------------------------------------------------------------------
// sendApplicationConfirmation
// ---------------------------------------------------------------------------
describe("sendApplicationConfirmation", () => {
  it("arma subject y menciona campaña y aplicante", async () => {
    await sendApplicationConfirmation({
      to: "x@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
    })
    const p = lastPayload()
    expect(p.subject).toBe("Recibimos tu aplicación para Verano")
    expect(p.html).toContain("Ana")
    expect(p.html).toContain("Verano")
  })
})

// ---------------------------------------------------------------------------
// sendApplicationAccepted (sin cuenta) + Existing (con cuenta)
// ---------------------------------------------------------------------------
describe("sendApplicationAccepted", () => {
  it("incluye el registerUrl para crear cuenta", async () => {
    await sendApplicationAccepted({
      to: "x@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
      registerUrl: "https://kool.co/register?inv=abc",
    })
    const p = lastPayload()
    expect(p.subject).toBe("¡Fuiste aceptado/a en Verano! Creá tu cuenta")
    expect(p.html).toContain("https://kool.co/register?inv=abc")
  })
})

describe("sendApplicationAcceptedExisting", () => {
  it("incluye el dashboardUrl en vez de registro", async () => {
    await sendApplicationAcceptedExisting({
      to: "x@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
      dashboardUrl: "https://kool.co/creator/program/1",
    })
    const p = lastPayload()
    expect(p.subject).toBe("¡Fuiste aceptado/a en Verano!")
    expect(p.html).toContain("https://kool.co/creator/program/1")
  })
})

// ---------------------------------------------------------------------------
// sendApplicationRejected
// ---------------------------------------------------------------------------
describe("sendApplicationRejected", () => {
  it("arma subject de actualización y menciona la marca", async () => {
    await sendApplicationRejected({
      to: "x@mail.com",
      applicantName: "Ana",
      campaignName: "Verano",
      brandName: "Acme",
    })
    const p = lastPayload()
    expect(p.subject).toBe("Actualización sobre tu aplicación a Verano")
    expect(p.html).toContain("Acme")
  })
})

// ---------------------------------------------------------------------------
// sendCampaignInviteExisting
// ---------------------------------------------------------------------------
describe("sendCampaignInviteExisting", () => {
  const base = {
    to: "x@mail.com",
    creatorName: "Ana",
    brandName: "Acme",
    campaignName: "Verano",
    dashboardUrl: "https://kool.co/creator",
  }

  it("muestra código y comisión cuando se pasan", async () => {
    await sendCampaignInviteExisting({ ...base, discountCode: "ANA10", commissionPct: 20 })
    const p = lastPayload()
    expect(p.subject).toBe('Acme te invitó a su campaña "Verano"')
    expect(p.html).toContain("ANA10")
    expect(p.html).toContain("20%")
    expect(p.html).toContain("https://kool.co/creator")
  })

  it("omite código y comisión cuando no se pasan", async () => {
    await sendCampaignInviteExisting(base)
    const p = lastPayload()
    expect(p.html).not.toContain('class="pill"')
    expect(p.html).not.toContain("% de comisión")
  })
})

// ---------------------------------------------------------------------------
// sendCampaignInviteNew
// ---------------------------------------------------------------------------
describe("sendCampaignInviteNew", () => {
  const base = {
    to: "x@mail.com",
    creatorName: "Ana",
    brandName: "Acme",
    campaignName: "Verano",
    registerUrl: "https://kool.co/register?inv=xyz",
  }

  it("muestra código y comisión + registerUrl cuando se pasan", async () => {
    await sendCampaignInviteNew({ ...base, discountCode: "ANA10", commissionPct: 25 })
    const p = lastPayload()
    expect(p.subject).toBe("Acme te invitó a su programa de creators en Kool")
    expect(p.html).toContain("ANA10")
    expect(p.html).toContain("25%")
    expect(p.html).toContain("https://kool.co/register?inv=xyz")
  })

  it("omite los bloques opcionales cuando no se pasan", async () => {
    await sendCampaignInviteNew(base)
    expect(lastPayload().html).not.toContain('class="pill"')
  })
})

// ---------------------------------------------------------------------------
// sendWelcomeCreator
// ---------------------------------------------------------------------------
describe("sendWelcomeCreator", () => {
  const base = {
    to: "x@mail.com",
    creatorName: "Ana",
    brandName: "Acme",
    dashboardUrl: "https://kool.co/creator",
  }

  it("subject fijo de bienvenida y saluda al creator", async () => {
    await sendWelcomeCreator(base)
    const p = lastPayload()
    expect(p.subject).toBe("¡Bienvenido/a a Kool! Tu cuenta está activa")
    expect(p.html).toContain("Ana")
  })

  it("incluye código y comisión cuando se pasan", async () => {
    await sendWelcomeCreator({ ...base, discountCode: "ANA10", commissionPct: 10 })
    const p = lastPayload()
    expect(p.html).toContain("ANA10")
    expect(p.html).toContain("10%")
  })
})

// ---------------------------------------------------------------------------
// sendSaleGenerated
// ---------------------------------------------------------------------------
describe("sendSaleGenerated", () => {
  it("formatea monto de orden y comisión, arma subject", async () => {
    await sendSaleGenerated({
      to: "x@mail.com",
      creatorName: "Ana",
      brandName: "Acme",
      orderAmount: 50000,
      commissionAmount: 5000,
      currency: "ARS",
      dashboardUrl: "https://kool.co/creator",
    })
    const p = lastPayload()
    expect(p.subject).toBe("¡Generaste una venta en Acme! 🎉")
    expect(p.html).toContain("ARS")
    expect(p.html).toContain("https://kool.co/creator")
  })
})

// ---------------------------------------------------------------------------
// sendBountyAchieved
// ---------------------------------------------------------------------------
describe("sendBountyAchieved", () => {
  it("menciona el bounty y la recompensa, arma subject", async () => {
    await sendBountyAchieved({
      to: "x@mail.com",
      creatorName: "Ana",
      brandName: "Acme",
      bountyName: "10 ventas",
      reward: "Kit premium",
      dashboardUrl: "https://kool.co/creator",
    })
    const p = lastPayload()
    expect(p.subject).toBe("🏆 ¡Desbloqueaste una recompensa en Acme!")
    expect(p.html).toContain("10 ventas")
    expect(p.html).toContain("Kit premium")
  })
})
