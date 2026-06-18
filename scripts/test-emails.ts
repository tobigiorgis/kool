/**
 * Test manual de los emails nuevos (bienvenida + venta generada).
 * NO se commitea — es para verificar en local.
 *
 * Uso (con tu key real, manda mails de verdad a tu casilla):
 *   npx dotenv -e .env.local -- npx tsx scripts/test-emails.ts tu@mail.com
 * o:
 *   RESEND_API_KEY=re_... EMAIL_FROM="Kool <hola@kool.link>" npx tsx scripts/test-emails.ts tu@mail.com
 */
import { sendWelcomeCreator, sendSaleGenerated } from "../src/lib/email/index"

async function main() {
  const to = process.argv[2]
  if (!to) {
    console.error("Falta destinatario. Uso: npx tsx scripts/test-emails.ts tu@mail.com")
    process.exit(1)
  }

  console.log(`Enviando emails de prueba a ${to}...`)
  console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "seteada" : "FALTA")
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM || "(default)")
  console.log("---")

  const welcome = await sendWelcomeCreator({
    to,
    creatorName: "Cami",
    brandName: "Perfumería X",
    discountCode: "CAMI10",
    commissionPct: 15,
    dashboardUrl: "https://app.joinkool.co/creator",
  })
  console.log("Bienvenida:", welcome)

  const sale = await sendSaleGenerated({
    to,
    creatorName: "Cami",
    brandName: "Perfumería X",
    orderAmount: 45000,
    commissionAmount: 6750,
    currency: "ARS",
    dashboardUrl: "https://app.joinkool.co/creator",
  })
  console.log("Venta generada:", sale)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
