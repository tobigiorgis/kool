/**
 * Smoke real de Resend: MANDA mails de verdad de las 11 templates a una casilla.
 * Sirve para verificar de punta a punta key + dominio remitente + render.
 * NO corre en CI (vive fuera de src/**\/*.test.ts).
 *
 * Uso (con tu key real en .env.local):
 *   npm run smoke:email tu@mail.com
 * o directo:
 *   RESEND_API_KEY=re_... EMAIL_FROM="Kool <hi@joinkool.co>" npx tsx scripts/smoke-email.ts tu@mail.com
 */
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
} from "../src/lib/email/index"

const BRAND = "Perfumería X"
const NAME = "Cami"
const DASH = "https://app.joinkool.co/creator"
const REGISTER = "https://app.joinkool.co/register?token=smoke"
const ONBOARD = "https://app.joinkool.co/onboarding/creator?token=smoke"

async function main() {
  const to = process.argv[2]
  if (!to) {
    console.error("Falta destinatario. Uso: npm run smoke:email tu@mail.com")
    process.exit(1)
  }

  console.log(`Enviando las 11 templates a ${to}...`)
  console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "seteada" : "FALTA")
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM || "(default)")
  console.log("---")

  // [nombre, thunk] — cada uno manda una template.
  const cases: [string, () => Promise<{ ok: boolean; id?: string; error?: unknown }>][] = [
    [
      "creatorInvite",
      () =>
        sendCreatorInvite({
          to,
          creatorName: NAME,
          brandName: BRAND,
          discountCode: "CAMI10",
          commissionPct: 15,
          onboardingUrl: ONBOARD,
        }),
    ],
    [
      "briefing",
      () =>
        sendBriefing({
          to,
          creatorName: NAME,
          brandName: BRAND,
          campaignName: "Lanzamiento Verano",
          briefingHtml: "<p>Usá el hashtag <strong>#PerfumeriaXVerano</strong> en tus posteos.</p>",
          startDate: "01/07",
          endDate: "31/07",
        }),
    ],
    [
      "applicationConfirmation",
      () =>
        sendApplicationConfirmation({
          to,
          applicantName: NAME,
          campaignName: "Lanzamiento Verano",
          brandName: BRAND,
        }),
    ],
    [
      "applicationAccepted",
      () =>
        sendApplicationAccepted({
          to,
          applicantName: NAME,
          campaignName: "Lanzamiento Verano",
          brandName: BRAND,
          registerUrl: REGISTER,
        }),
    ],
    [
      "applicationAcceptedExisting",
      () =>
        sendApplicationAcceptedExisting({
          to,
          applicantName: NAME,
          campaignName: "Lanzamiento Verano",
          brandName: BRAND,
          dashboardUrl: DASH,
        }),
    ],
    [
      "applicationRejected",
      () =>
        sendApplicationRejected({
          to,
          applicantName: NAME,
          campaignName: "Lanzamiento Verano",
          brandName: BRAND,
        }),
    ],
    [
      "campaignInviteExisting",
      () =>
        sendCampaignInviteExisting({
          to,
          creatorName: NAME,
          brandName: BRAND,
          campaignName: "Lanzamiento Verano",
          discountCode: "CAMI10",
          commissionPct: 20,
          dashboardUrl: DASH,
        }),
    ],
    [
      "campaignInviteNew",
      () =>
        sendCampaignInviteNew({
          to,
          creatorName: NAME,
          brandName: BRAND,
          campaignName: "Lanzamiento Verano",
          discountCode: "CAMI10",
          commissionPct: 20,
          registerUrl: REGISTER,
        }),
    ],
    [
      "welcomeCreator",
      () =>
        sendWelcomeCreator({
          to,
          creatorName: NAME,
          brandName: BRAND,
          discountCode: "CAMI10",
          commissionPct: 15,
          dashboardUrl: DASH,
        }),
    ],
    [
      "saleGenerated",
      () =>
        sendSaleGenerated({
          to,
          creatorName: NAME,
          brandName: BRAND,
          orderAmount: 45000,
          commissionAmount: 6750,
          currency: "ARS",
          dashboardUrl: DASH,
        }),
    ],
    [
      "bountyAchieved",
      () =>
        sendBountyAchieved({
          to,
          creatorName: NAME,
          brandName: BRAND,
          bountyName: "10 ventas",
          reward: "Kit premium + 5% extra",
          dashboardUrl: DASH,
        }),
    ],
  ]

  let failed = 0
  // Secuencial: evita rate limit de Resend y deja el log ordenado.
  for (const [name, thunk] of cases) {
    try {
      const res = await thunk()
      if (res.ok) {
        console.log(`✓ ${name}: ok (${res.id})`)
      } else {
        failed++
        console.error(`✗ ${name}: FALLÓ`, res.error)
      }
    } catch (err) {
      failed++
      console.error(`✗ ${name}: THREW`, err)
    }
  }

  console.log("---")
  console.log(`${cases.length - failed}/${cases.length} enviadas. ${failed} fallaron.`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
