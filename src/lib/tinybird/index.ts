/**
 * Kool — Analytics con Tinybird
 * Registra clics y consulta estadísticas en tiempo real
 */

const TINYBIRD_URL = process.env.TINYBIRD_BASE_URL || "https://api.tinybird.co"
const TINYBIRD_TOKEN = process.env.TINYBIRD_API_KEY!

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface ClickEvent {
  link_id: string
  workspace_id: string
  creator_id?: string
  timestamp: string          // ISO 8601
  country: string
  city: string
  region: string
  device: string             // "mobile" | "desktop" | "tablet"
  os: string                 // "iOS" | "Android" | "Windows" | "macOS" | "other"
  browser: string            // "Chrome" | "Safari" | "Instagram" | "TikTok" | "other"
  source: string             // "instagram" | "tiktok" | "whatsapp" | "direct" | "other"
  referer: string
  utm_campaign: string
  utm_source: string
  utm_medium: string
  ip_hash: string            // SHA256 del IP para unique clicks
}

export interface ClickStats {
  clicks: number
  unique_clicks: number
}

export interface ClicksByDay {
  date: string
  clicks: number
  unique_clicks: number
}

export interface ClicksByCountry {
  country: string
  clicks: number
}

export interface ClicksByCity {
  city: string
  country: string
  clicks: number
}

export interface ClicksByDevice {
  device: string
  clicks: number
  percentage: number
}

export interface ClicksBySource {
  source: string
  clicks: number
  percentage: number
}

// ─────────────────────────────────────────────
// INGEST — Registrar un clic
// ─────────────────────────────────────────────

/**
 * Envía un evento de clic a Tinybird.
 * Se llama en el endpoint de redirect del shortlink.
 * Es async/no-blocking para no afectar el tiempo de redirect.
 */
export async function trackClick(event: ClickEvent): Promise<void> {
  try {
    await fetch(`${TINYBIRD_URL}/v0/events?name=kool_clicks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    })
  } catch (error) {
    // No bloqueamos el redirect si Tinybird falla
    console.error("[Tinybird] Error tracking click:", error)
  }
}

// ─────────────────────────────────────────────
// QUERY — Consultar estadísticas
// ─────────────────────────────────────────────

async function queryTinybird<T>(
  pipe: string,
  params: Record<string, string>
): Promise<T[]> {
  const searchParams = new URLSearchParams(params)
  const url = `${TINYBIRD_URL}/v0/pipes/${pipe}.json?${searchParams}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TINYBIRD_TOKEN}` },
    // Cache de 60 segundos para no spammear Tinybird
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Tinybird query error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data as T[]
}

// ─── Stats por link ───────────────────────────

export async function getLinkStats(
  linkId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClickStats> {
  const rows = await queryTinybird<ClickStats>("kool_link_stats", {
    link_id: linkId,
    date_from: dateFrom,
    date_to: dateTo,
  })
  return rows[0] || { clicks: 0, unique_clicks: 0 }
}

export async function getLinkClicksByDay(
  linkId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClicksByDay[]> {
  return queryTinybird<ClicksByDay>("kool_clicks_by_day", {
    link_id: linkId,
    date_from: dateFrom,
    date_to: dateTo,
  })
}

export async function getLinkClicksByCountry(
  linkId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClicksByCountry[]> {
  return queryTinybird<ClicksByCountry>("kool_clicks_by_country", {
    link_id: linkId,
    date_from: dateFrom,
    date_to: dateTo,
    limit: "10",
  })
}

export async function getLinkClicksByDevice(
  linkId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClicksByDevice[]> {
  return queryTinybird<ClicksByDevice>("kool_clicks_by_device", {
    link_id: linkId,
    date_from: dateFrom,
    date_to: dateTo,
  })
}

export async function getLinkClicksBySource(
  linkId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClicksBySource[]> {
  return queryTinybird<ClicksBySource>("kool_clicks_by_source", {
    link_id: linkId,
    date_from: dateFrom,
    date_to: dateTo,
  })
}

// ─── Stats por workspace (dashboard general) ──

export async function getWorkspaceStats(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClickStats> {
  const rows = await queryTinybird<ClickStats>("kool_workspace_stats", {
    workspace_id: workspaceId,
    date_from: dateFrom,
    date_to: dateTo,
  })
  return rows[0] || { clicks: 0, unique_clicks: 0 }
}

export async function getWorkspaceClicksByDay(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClicksByDay[]> {
  return queryTinybird<ClicksByDay>("kool_workspace_clicks_by_day", {
    workspace_id: workspaceId,
    date_from: dateFrom,
    date_to: dateTo,
  })
}

// ─── Stats por creator ───────────────────────

export async function getCreatorStats(
  creatorId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClickStats> {
  const rows = await queryTinybird<ClickStats>("kool_creator_stats", {
    creator_id: creatorId,
    date_from: dateFrom,
    date_to: dateTo,
  })
  return rows[0] || { clicks: 0, unique_clicks: 0 }
}

// ─────────────────────────────────────────────
// UTILS — Parsing del Request
// ─────────────────────────────────────────────

import { UAParser } from "ua-parser-js"
import { createHash } from "crypto"

/**
 * Extrae los datos del request HTTP para construir
 * el evento de clic a enviar a Tinybird.
 */
export function parseClickFromRequest(
  request: Request,
  linkId: string,
  workspaceId: string,
  creatorId?: string,
  utmParams?: { campaign?: string; source?: string; medium?: string }
): ClickEvent {
  const ua = new UAParser(request.headers.get("user-agent") || "")
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || ""
  const referer = request.headers.get("referer") || ""

  // Detectar source desde referer
  const source = detectSource(referer)

  // Anonimizar IP con hash
  const ipHash = createHash("sha256").update(ip).digest("hex")

  return {
    link_id: linkId,
    workspace_id: workspaceId,
    creator_id: creatorId,
    timestamp: new Date().toISOString(),
    // Geo se completa con un servicio de geolocalización (ej: Vercel Edge)
    country: request.headers.get("x-vercel-ip-country") || "unknown",
    city: request.headers.get("x-vercel-ip-city") || "unknown",
    region: request.headers.get("x-vercel-ip-country-region") || "unknown",
    device: (ua.getDevice().type || "desktop") as string,
    os: ua.getOS().name || "other",
    browser: ua.getBrowser().name || "other",
    source,
    referer,
    utm_campaign: utmParams?.campaign || "",
    utm_source: utmParams?.source || "",
    utm_medium: utmParams?.medium || "",
    ip_hash: ipHash,
  }
}

function detectSource(referer: string): string {
  if (!referer) return "direct"
  if (referer.includes("instagram.com")) return "instagram"
  if (referer.includes("tiktok.com")) return "tiktok"
  if (referer.includes("youtube.com")) return "youtube"
  if (referer.includes("twitter.com") || referer.includes("x.com")) return "twitter"
  if (referer.includes("facebook.com")) return "facebook"
  if (referer.includes("whatsapp.com")) return "whatsapp"
  if (referer.includes("t.me") || referer.includes("telegram")) return "telegram"
  if (referer.includes("google.com")) return "google"
  return "other"
}
