/**
 * Kool — Integración Tiendanube
 * Maneja OAuth, API client y operaciones core
 */

import { createHmac, timingSafeEqual } from "crypto"
import { env } from "@/lib/env"

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
  subtotal?: string
  currency: string
  created_at: string // ISO 8601
  paid_at?: string // ISO 8601, disponible cuando payment_status = "paid"
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
  // Cupones aplicados a la orden. Tiendanube los devuelve acá (array), NO en
  // `promotional_discount.code`. Es el campo real donde vive el código del creator.
  coupon?: {
    id: number
    code: string
    type: string
    value: string
  }[]
  utm_parameters?: {
    campaign: string
    source: string
    medium: string
    content: string
  } | null
  // Visita de aterrizaje. Acá viven los UTM REALES (el top-level utm_parameters
  // viene siempre null). `utm_content` = slug del link de Kool; `landing_page`
  // es la URL completa por la que entró el cliente (con o sin cupón).
  customer_visit?: {
    landing_page?: string | null
    utm_parameters?: {
      utm_content?: string | null
      utm_campaign?: string | null
      utm_source?: string | null
      utm_medium?: string | null
      utm_term?: string | null
    } | null
  } | null
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
  const clientId = env.TIENDANUBE_CLIENT_ID
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: ["write_orders", "read_orders", "write_coupons", "read_products", "write_scripts"].join(
      " "
    ),
    redirect_uri: env.TIENDANUBE_REDIRECT_URI,
    state,
  })

  return `${TIENDANUBE_AUTH}/${clientId}/authorize?${params.toString()}`
}

/**
 * Intercambia el código de autorización por un access_token.
 * Se llama una sola vez durante el callback OAuth.
 */
export async function exchangeTiendanubeCode(code: string): Promise<TiendanubeTokenResponse> {
  const response = await fetch(`${TIENDANUBE_AUTH}/authorize/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.TIENDANUBE_CLIENT_ID,
      client_secret: env.TIENDANUBE_CLIENT_SECRET,
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
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Kool (hi@joinkool.co)",
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
  return tiendanubeRequest<TiendanubeStore>(storeId, accessToken, "GET", "/store")
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
    storeId,
    accessToken,
    "GET",
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
  return tiendanubeRequest(storeId, accessToken, "POST", "/coupons", payload)
}

export async function deleteTiendanubeCoupon(
  storeId: string,
  accessToken: string,
  couponId: string
) {
  return tiendanubeRequest(storeId, accessToken, "DELETE", `/coupons/${couponId}`)
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

  return tiendanubeRequest(storeId, accessToken, "POST", "/orders", orderPayload)
}

// ─────────────────────────────────────────────
// ÓRDENES
// ─────────────────────────────────────────────

export async function getTiendanubeOrders(
  storeId: string,
  accessToken: string,
  params: { per_page?: number; page?: number; payment_status?: string } = {}
): Promise<TiendanubeOrder[]> {
  const qs = new URLSearchParams({
    per_page: String(params.per_page ?? 50),
    page: String(params.page ?? 1),
    ...(params.payment_status ? { payment_status: params.payment_status } : {}),
  })
  return tiendanubeRequest<TiendanubeOrder[]>(storeId, accessToken, "GET", `/orders?${qs}`)
}

/**
 * Trae UNA orden completa por id. El webhook order/paid la usa para garantizar
 * los campos que el payload del webhook puede no traer (ej. `customer_visit`,
 * donde viven los UTM reales) y el cupón autoritativo (`order.coupon[]`).
 */
export async function getTiendanubeOrder(
  storeId: string,
  accessToken: string,
  orderId: string
): Promise<TiendanubeOrder> {
  return tiendanubeRequest<TiendanubeOrder>(storeId, accessToken, "GET", `/orders/${orderId}`)
}

export async function getTiendanubeWebhooks(
  storeId: string,
  accessToken: string
): Promise<{ id: number; event: string; url: string }[]> {
  return tiendanubeRequest(storeId, accessToken, "GET", "/webhooks")
}

// ─────────────────────────────────────────────
// SCRIPTS (storefront / checkout JS injection)
// ─────────────────────────────────────────────
//
// MODELO ACTUAL (2025-03): los scripts NO se registran por API con un `src`
// propio. El endpoint legacy POST /scripts ya no registra scripts. El flujo es:
//
//   1. Registrar el script en el Partner Portal (partners.tiendanube.com):
//      name, handle, location (store|checkout), event (onfirstinteraction|onload),
//      y subir el archivo JS (Tiendanube lo hostea en apps-scripts.tiendanube.com).
//   2. Marcarlo "auto install" → se activa solo en cada tienda que instaló la app.
//      No hace falta ninguna llamada a la API.
//   3. Si NO es auto-install → asociar por tienda con POST /scripts
//      { script_id, query_params }.
//
// Kool usa auto-install, así que acá sólo exponemos lectura para diagnóstico.

export interface TiendanubeScript {
  id: number
  name?: string | { es?: string } | Record<string, string>
  handle?: string
  event?: string // onfirstinteraction | onload
  location?: string // store | checkout
  status?: string
  is_auto_install?: boolean
  src?: string
  created_at?: string
  updated_at?: string
}

/**
 * Lista los scripts registrados/activos para una tienda.
 * Sirve para verificar qué se está cargando realmente en el storefront.
 */
export async function getTiendanubeScripts(
  storeId: string,
  accessToken: string
): Promise<TiendanubeScript[]> {
  return tiendanubeRequest<TiendanubeScript[]>(storeId, accessToken, "GET", "/scripts")
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
export async function registerTiendanubeWebhooks(storeId: string, accessToken: string) {
  const baseUrl = env.NEXT_PUBLIC_APP_URL

  const webhooks = [
    {
      event: "order/paid",
      url: `${baseUrl}/api/webhooks/tiendanube/order-paid`,
    },
  ]

  const results = await Promise.allSettled(
    webhooks.map((webhook) => tiendanubeRequest(storeId, accessToken, "POST", "/webhooks", webhook))
  )

  return results
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
  orderDate: Date
  creatorCode: string | null // Código de cupón o utm_campaign
  linkSlug: string | null // utm_content = slug del link de Kool
  utmCampaign: string | null
  couponApplied: boolean // ¿la orden trae algún cupón aplicado?
} {
  // El cupón aplicado vive en `order.coupon` (array). `promotional_discount`
  // NO trae `code` (solo montos), así que leerlo de ahí daba siempre null.
  const couponCode = Array.isArray(order.coupon)
    ? order.coupon.find((c) => c?.code)?.code
    : undefined

  // Los UTM reales viven en `customer_visit`, no en el top-level (siempre null).
  const visitUtm = order.customer_visit?.utm_parameters

  const creatorCode =
    couponCode?.toUpperCase() ||
    visitUtm?.utm_campaign?.toUpperCase() ||
    order.promotional_discount?.code?.toUpperCase() ||
    order.utm_parameters?.campaign?.toUpperCase() ||
    null

  // Slug del link: customer_visit.utm_content → parse de landing_page → top-level.
  const linkSlug =
    visitUtm?.utm_content ||
    utmContentFromUrl(order.customer_visit?.landing_page) ||
    order.utm_parameters?.content ||
    null

  return {
    orderId: order.id.toString(),
    orderAmount: parseFloat(order.subtotal ?? order.total),
    currency: order.currency,
    orderDate: new Date(order.paid_at || order.created_at),
    creatorCode,
    linkSlug,
    utmCampaign: visitUtm?.utm_campaign || order.utm_parameters?.campaign || null,
    couponApplied: !!couponCode,
  }
}

/** Extrae `utm_content` de una URL de landing (sandbox-safe, devuelve null si falla). */
function utmContentFromUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).searchParams.get("utm_content")
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────
// WEBHOOK — VERIFICACIÓN DE FIRMA (HMAC)
// ─────────────────────────────────────────────
//
// Tiendanube firma cada webhook con HMAC-SHA256 del body CRUDO usando el
// client_secret de la app, en el header `x-linkedstore-hmac-sha256`.
// Verificamos SIEMPRE antes de procesar: sin esto, cualquiera que conozca la
// URL del endpoint podría POSTear órdenes falsas y disparar comisiones
// fraudulentas (plata real).

function hmacSha256(rawBody: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest()
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Verifica la firma HMAC de un webhook de Tiendanube contra el client_secret.
 * Compara contra hex y base64 para ser robusto al encoding del header.
 * Fail-closed: devuelve false si falta el secret o la firma.
 */
export function verifyTiendanubeWebhookSignature(
  rawBody: string,
  signature: string | null | undefined
): boolean {
  const secret = env.TIENDANUBE_CLIENT_SECRET
  if (!secret || !signature) return false
  const digest = hmacSha256(rawBody, secret)
  return (
    timingSafeEqualStr(signature, digest.toString("hex")) ||
    timingSafeEqualStr(signature, digest.toString("base64"))
  )
}

/**
 * Firma un body como lo haría Tiendanube (hex). SÓLO para tests/simulación
 * del webhook — no se usa en producción.
 */
export function signTiendanubeWebhook(rawBody: string): string {
  const secret = env.TIENDANUBE_CLIENT_SECRET
  if (!secret) throw new Error("TIENDANUBE_CLIENT_SECRET no seteada")
  return hmacSha256(rawBody, secret).toString("hex")
}
