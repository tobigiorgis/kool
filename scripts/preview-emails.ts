/**
 * Render preview de los emails SIN mandar nada (mockea fetch, captura el HTML).
 * NO se commitea.
 *   npx tsx scripts/preview-emails.ts
 * Escribe los HTML a /tmp/kool-email-*.html para abrir en el navegador.
 */
import { writeFileSync } from "fs"

const captured: { subject: string; html: string }[] = []

// Mock global fetch: intercepta el POST a Resend y captura el body
const realFetch = globalThis.fetch
globalThis.fetch = (async (url: any, opts: any) => {
  try {
    const body = JSON.parse(opts?.body ?? "{}")
    if (body.html) captured.push({ subject: body.subject, html: body.html })
  } catch {}
  return new Response(JSON.stringify({ id: "preview-id" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}) as typeof realFetch

async function main() {
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_preview"
  const { sendWelcomeCreator, sendSaleGenerated } = await import("../src/lib/email/index")

  await sendWelcomeCreator({
    to: "preview@test.com",
    creatorName: "Cami",
    brandName: "Perfumería X",
    discountCode: "CAMI10",
    commissionPct: 15,
    dashboardUrl: "https://app.joinkool.co/creator",
  })

  await sendSaleGenerated({
    to: "preview@test.com",
    creatorName: "Cami",
    brandName: "Perfumería X",
    orderAmount: 45000,
    commissionAmount: 6750,
    currency: "ARS",
    dashboardUrl: "https://app.joinkool.co/creator",
  })

  const names = ["welcome", "sale"]
  captured.forEach((c, i) => {
    const path = `/tmp/kool-email-${names[i] ?? i}.html`
    writeFileSync(path, c.html)
    console.log(`✓ ${names[i] ?? i}: "${c.subject}" → ${path} (${c.html.length} bytes)`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
