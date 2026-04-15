/**
 * Kool — Redirect handler
 *
 * Ruta pública: /api/r/[slug]
 * Guarda el click en Postgres y redirige al destino.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UAParser } from "ua-parser-js"
import { createHash } from "crypto"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const link = await prisma.link.findUnique({
      where: { slug },
      include: { creator: true },
    })

    if (!link || link.archived) {
      return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!))
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!))
    }

    const destinationUrl = buildDestinationUrl(link)

    // Guardar click (antes del redirect — garantiza que se persiste)
    try {
      const ua = new UAParser(request.headers.get("user-agent") || "")
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ""
      const referer = request.headers.get("referer") || ""
      const ipHash = createHash("sha256").update(ip).digest("hex")

      await prisma.click.create({
        data: {
          linkId: link.id,
          country: request.headers.get("x-vercel-ip-country") || undefined,
          city:    request.headers.get("x-vercel-ip-city") || undefined,
          region:  request.headers.get("x-vercel-ip-country-region") || undefined,
          device:  ua.getDevice().type || "desktop",
          os:      ua.getOS().name || undefined,
          browser: ua.getBrowser().name || undefined,
          referer: referer || undefined,
          source:  detectSource(referer),
          ipHash,
        },
      })
    } catch (e) {
      console.error("[Click] Error saving:", e)
    }

    return NextResponse.redirect(destinationUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer-when-downgrade",
      },
    })
  } catch (error) {
    console.error("[Redirect] Error:", error)
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!))
  }
}

function buildDestinationUrl(link: {
  destination: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  discountCode?: string | null
  creator?: { discountCode?: string | null } | null
}): string {
  try {
    const url = new URL(link.destination)
    if (link.utmSource)   url.searchParams.set("utm_source", link.utmSource)
    if (link.utmMedium)   url.searchParams.set("utm_medium", link.utmMedium)
    if (link.utmCampaign) url.searchParams.set("utm_campaign", link.utmCampaign)
    if (link.utmContent)  url.searchParams.set("utm_content", link.utmContent)
    const code = link.discountCode || link.creator?.discountCode
    if (code) {
      url.searchParams.set("ref", code)
      url.searchParams.set("utm_campaign", code)
    }
    return url.toString()
  } catch {
    return link.destination
  }
}

function detectSource(referer: string): string {
  if (!referer) return "direct"
  if (referer.includes("instagram.com")) return "instagram"
  if (referer.includes("tiktok.com"))    return "tiktok"
  if (referer.includes("youtube.com"))   return "youtube"
  if (referer.includes("twitter.com") || referer.includes("x.com")) return "twitter"
  if (referer.includes("facebook.com")) return "facebook"
  if (referer.includes("whatsapp.com")) return "whatsapp"
  if (referer.includes("t.me") || referer.includes("telegram")) return "telegram"
  if (referer.includes("google.com"))   return "google"
  return "other"
}
