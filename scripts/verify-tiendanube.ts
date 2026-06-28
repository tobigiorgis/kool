/**
 * Kool — Harness de verificación Tiendanube (end-to-end).
 *
 * Verifica los dos extremos de la integración:
 *   1. Qué scripts/webhooks están realmente cargados en una tienda conectada.
 *   2. Que el webhook order/paid atribuye conversión + comisión correctamente,
 *      disparando un order/paid sintético contra el endpoint real.
 *
 * Uso (necesita ENCRYPTION_KEY + DATABASE_URL; `simulate` además
 * TIENDANUBE_CLIENT_SECRET para firmar el webhook → corré con dotenv):
 *
 *   # Listar scripts + webhooks + últimas conversiones de una tienda
 *   npx dotenv -e .env.local -- npx tsx scripts/verify-tiendanube.ts list <ref>
 *
 *   # Disparar un order/paid sintético y ver Conversion + Commission generadas
 *   #   (requiere el server corriendo, o pasar --url <deploy>)
 *   npx dotenv -e .env.local -- npx tsx scripts/verify-tiendanube.ts simulate <ref> \
 *     --coupon CAMILA --amount 45000 [--currency ARS] [--product 123 --variant 456 --qty 1] \
 *     [--utm CAMILA] [--url http://localhost:3000]
 *
 *   # Borrar las filas de prueba (orderId que empieza con KOOLTEST-)
 *   npx dotenv -e .env.local -- npx tsx scripts/verify-tiendanube.ts cleanup [<ref>]
 *
 * <ref> = workspaceId | storeId | parte del dominio. Si lo omitís y hay una
 * sola tienda conectada, se usa esa.
 */
import { prisma } from "../src/lib/prisma"
import { decrypt } from "../src/lib/utils/crypto"
import {
  getTiendanubeScripts,
  getTiendanubeWebhooks,
  signTiendanubeWebhook,
} from "../src/lib/tiendanube"

// ── args ───────────────────────────────────────
function getFlag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 ? process.argv[i + 1] : undefined
}

async function resolveConnection(ref?: string) {
  if (!ref) {
    const all = await prisma.tiendanubeConnection.findMany({ where: { active: true } })
    if (all.length === 1) return all[0]
    if (all.length === 0) throw new Error("No hay tiendas conectadas.")
    throw new Error(
      `Hay ${all.length} tiendas conectadas, pasá un <ref>:\n` +
        all.map((c) => `  - ${c.storeDomain} (ws ${c.workspaceId}, store ${c.storeId})`).join("\n")
    )
  }
  const conn = await prisma.tiendanubeConnection.findFirst({
    where: {
      OR: [
        { workspaceId: ref },
        { storeId: ref },
        { storeDomain: { contains: ref } },
        { storeUrl: { contains: ref } },
      ],
    },
  })
  if (!conn) throw new Error(`No se encontró tienda para ref="${ref}".`)
  return conn
}

function fmtName(n: unknown): string {
  if (typeof n === "string") return n
  if (n && typeof n === "object") return (n as Record<string, string>).es || JSON.stringify(n)
  return String(n)
}

// ── list ───────────────────────────────────────
async function cmdList(ref?: string) {
  const conn = await resolveConnection(ref)
  console.log(`\n🏪 ${conn.storeDomain}  (workspace ${conn.workspaceId}, store ${conn.storeId})`)

  const token = decrypt(conn.accessToken)

  console.log("\n— Scripts cargados (GET /scripts) —")
  try {
    const scripts = await getTiendanubeScripts(conn.storeId, token)
    if (!scripts.length) {
      console.log(
        "  ⚠️  Ninguno. Registrá kool-tracker / kool-checkout en el Partner Portal (auto-install)."
      )
    } else {
      for (const s of scripts) {
        console.log(
          `  • [${s.id}] ${fmtName(s.name) || s.handle || "?"} — location=${s.location} event=${s.event} ` +
            `auto_install=${s.is_auto_install} status=${s.status ?? "?"}`
        )
      }
    }
  } catch (e) {
    console.log("  ❌", e instanceof Error ? e.message : e)
  }

  console.log("\n— Webhooks registrados (GET /webhooks) —")
  try {
    const hooks = await getTiendanubeWebhooks(conn.storeId, token)
    const paid = hooks.find((h) => h.event === "order/paid")
    for (const h of hooks) console.log(`  • [${h.id}] ${h.event} → ${h.url}`)
    if (!paid) console.log("  ⚠️  Falta order/paid — no se atribuirá ninguna venta.")
  } catch (e) {
    console.log("  ❌", e instanceof Error ? e.message : e)
  }

  // Últimas conversiones / comisiones del workspace
  const creators = await prisma.creator.findMany({
    where: { workspaceId: conn.workspaceId },
    select: { id: true },
  })
  const creatorIds = creators.map((c) => c.id)
  const conversions = await prisma.conversion.findMany({
    where: { platform: "TIENDANUBE", creatorId: { in: creatorIds } },
    orderBy: { convertedAt: "desc" },
    take: 10,
  })
  const commissions = await prisma.commission.findMany({
    where: { conversionId: { in: conversions.map((c) => c.id) } },
  })
  const commByConv = new Map(commissions.map((c) => [c.conversionId, c]))

  console.log("\n— Últimas conversiones Tiendanube —")
  if (!conversions.length) console.log("  (ninguna todavía)")
  for (const c of conversions) {
    const comm = commByConv.get(c.id)
    console.log(
      `  • order ${c.orderId} — ${c.orderAmount} ${c.currency} → ` +
        (comm ? `comisión ${comm.amount} (${comm.percentage}%, ${comm.status})` : "sin comisión")
    )
  }
  console.log()
}

// ── simulate ───────────────────────────────────
async function cmdSimulate(ref?: string) {
  const conn = await resolveConnection(ref)
  const coupon = getFlag("coupon")
  const utm = getFlag("utm")
  const amount = parseFloat(getFlag("amount") || "10000")
  const currency = getFlag("currency") || "ARS"
  const product = getFlag("product")
  const variant = getFlag("variant")
  const qty = parseInt(getFlag("qty") || "1", 10)
  const baseUrl = getFlag("url") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  if (!coupon && !utm) {
    throw new Error("Pasá --coupon CODE (y/o --utm CODE) para que haya algo que atribuir.")
  }

  const code = (coupon || utm)!.toUpperCase()

  // Pre-check: ¿existe un creator con ese código en este workspace?
  const cc = await prisma.campaignCreator.findFirst({
    where: { discountCode: code, campaign: { workspaceId: conn.workspaceId } },
    include: { creator: true },
  })
  const legacy = cc?.creator
    ? null
    : await prisma.creator.findFirst({
        where: { workspaceId: conn.workspaceId, discountCode: code, status: "ACTIVE" },
      })
  const matched = cc?.creator || legacy
  if (!matched) {
    console.log(
      `⚠️  No hay CampaignCreator ni Creator ACTIVE con discountCode="${code}" en este workspace.\n` +
        `   El webhook va a responder attributed:false. Creá el creator/código primero si querés ver la comisión.`
    )
  } else {
    console.log(`✓ Código "${code}" → creator ${matched.name || matched.firstName || matched.id}`)
  }

  const ts = Date.now()
  const orderId = `KOOLTEST-${ts}`
  const payload: Record<string, unknown> = {
    id: orderId,
    number: ts % 100000,
    store_id: conn.storeId,
    status: "open",
    payment_status: "paid",
    total: String(amount),
    currency,
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    customer: { name: "Kool Test", email: "test@joinkool.co" },
    products:
      product || variant
        ? [
            {
              product_id: product ? Number(product) : undefined,
              variant_id: variant ? Number(variant) : undefined,
              name: "Producto de prueba",
              quantity: qty,
              price: String(amount),
            },
          ]
        : [],
  }
  if (coupon) {
    payload.promotional_discount = { id: 0, code, type: "percentage", value: "0" }
  }
  if (utm) {
    payload.utm_parameters = { campaign: code, source: "kool", medium: "test", content: "" }
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/webhooks/tiendanube/order-paid`
  console.log(`\n→ POST ${endpoint}  (order ${orderId}, ${amount} ${currency})`)

  // Firmar el body igual que Tiendanube (el webhook ahora valida HMAC).
  const rawBody = JSON.stringify(payload)
  let res: Response
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-store-id": conn.storeId,
        "x-linkedstore-hmac-sha256": signTiendanubeWebhook(rawBody),
      },
      body: rawBody,
    })
  } catch (e) {
    throw new Error(
      `No se pudo conectar a ${endpoint}.\n` +
        `   Levantá el server (npm run dev) o pasá --url <deploy>.\n   ${e instanceof Error ? e.message : e}`
    )
  }

  const json = await res.json().catch(() => ({}))
  console.log(`← ${res.status}`, JSON.stringify(json))

  // Leer de la DB lo que quedó grabado
  const conv = await prisma.conversion.findFirst({ where: { orderId, platform: "TIENDANUBE" } })
  const comm = conv ? await prisma.commission.findFirst({ where: { conversionId: conv.id } }) : null

  console.log("\n— Resultado en DB —")
  if (!conv) {
    console.log("  ❌ No se creó Conversion. (sin atribución, o el server escribe en otra DB)")
  } else {
    console.log(
      `  ✓ Conversion ${conv.id} — order ${conv.orderId}, ${conv.orderAmount} ${conv.currency}`
    )
    if (comm) {
      console.log(
        `  ✓ Commission ${comm.id} — ${comm.amount} ${comm.currency} (${comm.percentage}%, ${comm.status})`
      )
    } else {
      console.log("  ⚠️  Conversion sin Commission.")
    }
  }
  console.log(`\n(limpiar: npx ... scripts/verify-tiendanube.ts cleanup ${ref || ""})\n`)
}

// ── cleanup ────────────────────────────────────
async function cmdCleanup() {
  const convs = await prisma.conversion.findMany({
    where: { orderId: { startsWith: "KOOLTEST-" } },
    select: { id: true, orderId: true },
  })
  if (!convs.length) {
    console.log("Nada que limpiar (sin orders KOOLTEST-).")
    return
  }
  const ids = convs.map((c) => c.id)
  const delComm = await prisma.commission.deleteMany({ where: { conversionId: { in: ids } } })
  const delSales = await prisma.dropProductSale.deleteMany({ where: { conversionId: { in: ids } } })
  const delConv = await prisma.conversion.deleteMany({ where: { id: { in: ids } } })
  console.log(
    `🧹 Borrado: ${delConv.count} conversions, ${delComm.count} commissions, ${delSales.count} drop sales.`
  )
}

// ── main ───────────────────────────────────────
async function main() {
  const cmd = process.argv[2]
  const ref = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : undefined

  switch (cmd) {
    case "list":
      await cmdList(ref)
      break
    case "simulate":
      await cmdSimulate(ref)
      break
    case "cleanup":
      await cmdCleanup()
      break
    default:
      console.log(
        "Comandos: list <ref> | simulate <ref> --coupon CODE --amount N | cleanup [<ref>]"
      )
      process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error("\n❌", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
