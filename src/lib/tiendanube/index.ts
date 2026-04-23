/**
 * Kool — Integración Tiendanube
 * Maneja OAuth, API client y operaciones core
 */

const TIENDANUBE_API = "https://api.tiendanube.com/2025-03"
const TIENDANUBE_AUTH = "https://www.tiendanube.com/apps"

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface TiendanubeTokenResponse {
  access_token: string
  token_type: string
  scope: string
  user_id: number // store_id
}

export interface TiendanubeStore {
  id: number
  name: string
  url: string
  main_domain: string
  email: string
  country: string
  currency: string
}

export interface TiendanubeProduct {
  id: number
  name: { es: string }
  variants: TiendanubeVariant[]
  images: { src: string }[]
}

export interface TiendanubeVariant {
  id: number
  price: string
  sku: string | null
  stock: number | null
}

export interface TiendanubeOrder {
  id: number
  number: number
  status: string
  payment_status: string
  total: string
  currency: string
  customer: {
    name: string
    email: string
  }
  shipping_address: {
    name: string
    address: string
    city: string
    province: string
    zipcode: string
    country: string
    phone: string
  }
  products: {
    product_id: number
    variant_id: number
    name: string
    quantity: number
    price: string
  }[]
  promotional_discount?: {
    id: number
    code: string
    type: string
    value: string
  }
  utm_parameters?: {
    campaign: string
    source: string
    medium: string
    content: string
  }
}

export interface CreateCouponPayload {
  code: string
  type: "percentage" | "absolute"
  value: number
  valid: boolean
  max_uses?: number
  min_price?: number
  start_date?: string
  end_date?: string
}

export interface CreateOrderPayload {
  // Draft order para gifting
  contact_email: string
  contact_name: string
  products: {
    variant_id: number
    quantity: number
    price: number // 0 para gifting
  }[]
  shipping_address: {
    first_name: string
    last_name: string
    address: string
    city: string
    province: string
    zipcode: string
    country: string
    phone: string
  }
  billing_address: {
    first_name: string
    last_name: string
    address: string
    city: string
    province: string
    zipcode: string
    country: string
    phone: string
  }
  note?: string
  send_email?: boolean
}

// ─────────────────────────────────────────────
// OAUTH
// ─────────────────────────────────────────────

/**
 * Genera la URL de autorización OAuth para Tiendanube.
 * El merchant es redirigido a esta URL para autorizar la app.
 */
export function getTiendanubeAuthUrl(state: string): string {
  const clientId = process.env.TIENDANUBE_CLIENT_ID!
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: [
      "write_orders",
      "read_orders",
      "write_coupons",
      "read_products",
      "write_scripts",
    ].join(" "),
    redirect_uri: process.env.TIENDANUBE_REDIRECT_URI!,
    state,
  })

  return `${TIENDANUBE_AUTH}/${clientId}/authorize?${params.toString()}`
}

/**
 * Intercambia el código de autorización por un access_token.
 * Se llama una sola vez durante el callback OAuth.
 */
export async function exchangeTiendanubeCode(
  code: string
): Promise<TiendanubeTokenResponse> {
  const response = await fetch(`${TIENDANUBE_AUTH}/authorize/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.TIENDANUBE_CLIENT_ID,
      client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tiendanube OAuth error: ${error}`)
  }

  return response.json()
}

// ─────────────────────────────────────────────
// API CLIENT
// ─────────────────────────────────────────────

/**
 * Cliente base para llamadas a la API de Tiendanube.
 * Todas las operaciones usan esta función.
 */
async function tiendanubeRequest<T>(
  storeId: string,
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${TIENDANUBE_API}/${storeId}${path}`

  const response = await fetch(url, {
    method,
    headers: {
      "Authentication": `bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Kool (hola@kool.link)",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 402) {
    throw new Error("STORE_PAYMENT_REQUIRED")
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tiendanube API error ${response.status}: ${error}`)
  }

  return response.json()
}

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────

export async function getTiendanubeStore(
  storeId: string,
  accessToken: string
): Promise<TiendanubeStore> {
  return tiendanubeRequest<TiendanubeStore>(
    storeId, accessToken, "GET", "/store"
  )
}

// ─────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────

export async function getTiendanubeProducts(
  storeId: string,
  accessToken: string,
  page = 1
): Promise<TiendanubeProduct[]> {
  return tiendanubeRequest<TiendanubeProduct[]>(
    storeId, accessToken, "GET",
    `/products?page=${page}&per_page=50&published=true`
  )
}

// ─────────────────────────────────────────────
// CUPONES DE DESCUENTO
// ─────────────────────────────────────────────

/**
 * Crea un cupón de descuento en Tiendanube.
 * Se llama automáticamente cuando se agrega un creator al programa.
 *
 * Ejemplo:
 *   createTiendanubeCoupon(storeId, token, {
 *     code: "CAMILA15",
 *     type: "percentage",
 *     value: 15,
 *     valid: true,
 *   })
 */
export async function createTiendanubeCoupon(
  storeId: string,
  accessToken: string,
  payload: CreateCouponPayload
) {
  return tiendanubeRequest(
    storeId, accessToken, "POST", "/coupons", payload
  )
}

export async function deleteTiendanubeCoupon(
  storeId: string,
  accessToken: string,
  couponId: string
) {
  return tiendanubeRequest(
    storeId, accessToken, "DELETE", `/coupons/${couponId}`
  )
}

// ─────────────────────────────────────────────
// GIFTING — CREACIÓN DE ÓRDENES
// ─────────────────────────────────────────────

/**
 * Crea una orden de gifting en Tiendanube.
 * El precio de los productos va a $0 (regalo).
 * La orden tiene una nota indicando que es gifting de Kool.
 *
 * IMPORTANTE: Tiendanube no tiene "draft orders" como Shopify.
 * Creamos una orden real con precio 0 y un tag especial.
 */
export async function createTiendanubeGiftingOrder(
  storeId: string,
  accessToken: string,
  payload: CreateOrderPayload
) {
  const orderPayload = {
    ...payload,
    // Tag para identificar gifting en el panel de Tiendanube
    note: `[KOOL GIFTING] ${payload.note || ""}`.trim(),
    // Enviar notificación a quien recibe el gifting
    send_email: payload.send_email ?? false,
  }

  return tiendanubeRequest(
    storeId, accessToken, "POST", "/orders", orderPayload
  )
}

// ─────────────────────────────────────────────
// WEBHOOKS — REGISTRO
// ─────────────────────────────────────────────

/**
 * Registra los webhooks necesarios en la tienda.
 * Se llama una sola vez cuando la tienda conecta su cuenta.
 *
 * Webhooks que registramos:
 * - order/paid: para atribución de conversiones
 */
export async function registerTiendanubeWebhooks(
  storeId: string,
  accessToken: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  const webhooks = [
    {
      event: "order/paid",
      url: `${baseUrl}/api/webhooks/tiendanube/order-paid`,
    },
  ]

  const results = await Promise.allSettled(
    webhooks.map((webhook) =>
      tiendanubeRequest(storeId, accessToken, "POST", "/webhooks", webhook)
    )
  )

  return results
}

// ─────────────────────────────────────────────
// SCRIPT DE TRACKING (storefront)
// ─────────────────────────────────────────────

/**
 * Inyecta el script de Kool en el storefront de la tienda.
 * Este script detecta ?ref=CREATOR en la URL y aplica
 * el cupón automáticamente en el checkout.
 */
export async function installTiendanubeScript(
  storeId: string,
  accessToken: string
) {
  const scriptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scripts/kool-tracker.js`

  return tiendanubeRequest(storeId, accessToken, "POST", "/scripts", {
    src: scriptUrl,
    event: "onload",
    where: "store",
  })
}

// ─────────────────────────────────────────────
// WEBHOOK HANDLER — PARSING
// ─────────────────────────────────────────────

/**
 * Parsea un webhook order/paid de Tiendanube y extrae
 * los datos relevantes para la atribución.
 */
export function parseTiendanubeOrderWebhook(order: TiendanubeOrder): {
  orderId: string
  storeId?: string
  orderAmount: number
  currency: string
  creatorCode: string | null  // El código del creator si usó cupón
  utmCampaign: string | null  // UTM campaign si viene en la URL
} {
  // El creator code puede venir de:
  // 1. El código de cupón usado (más confiable)
  // 2. El utm_campaign de los parámetros UTM

  const creatorCode =
    order.promotional_discount?.code?.toUpperCase() ||
    order.utm_parameters?.campaign?.toUpperCase() ||
    null

  return {
    orderId: order.id.toString(),
    orderAmount: parseFloat(order.total),
    currency: order.currency,
    creatorCode,
    utmCampaign: order.utm_parameters?.campaign || null,
  }
}
