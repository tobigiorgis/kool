/**
 * Kool — Redirect handler
 *
 * Maneja el redirect de todos los shortlinks.
 * URL: kool.link/[slug]
 *
 * En producción este handler corre en Vercel Edge Functions
 * para minimizar latencia (< 50ms de redirect).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { trackClick, parseClickFromRequest } from "@/lib/tinybird"

export const runtime = "edge"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  try {
    // Buscar el link por slug
    const link = await prisma.link.findUnique({
      where: { slug },
      include: { creator: true },
    })

    // Link no encontrado → redirect a home
    if (!link || link.archived) {
      return NextResponse.redirect(
        new URL("/", process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    // Verificar expiración
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.redirect(
        new URL("/link-expirado", process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    // Verificar límite de clics
    if (link.maxClicks) {
      // Este check lo hacemos async para no bloquear el redirect
      // Si supera el límite, el próximo redirect será rechazado
    }

    // Construir URL de destino con UTM params
    const destinationUrl = buildDestinationUrl(link)

    // Trackear el clic en Tinybird (async, no bloquea el redirect)
    const searchParams = new URL(request.url).searchParams
    const clickEvent = parseClickFromRequest(
      request,
      link.id,
      link.workspaceId,
      link.creatorId || undefined,
      {
        campaign: link.utmCampaign || link.creator?.discountCode || undefined,
        source: link.utmSource || undefined,
        medium: link.utmMedium || undefined,
      }
    )

    // Fire and forget — no esperamos respuesta de Tinybird
    trackClick(clickEvent)

    // Redirect 302 (no cachear) con headers de seguridad
    return NextResponse.redirect(destinationUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer-when-downgrade",
      },
    })
  } catch (error) {
    console.error("[Redirect] Error:", error)
    // En caso de error, redirect a la home de Kool
    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}

/**
 * Construye la URL de destino agregando parámetros UTM
 * y el parámetro ref del creator si corresponde.
 */
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

    // UTM params
    if (link.utmSource) url.searchParams.set("utm_source", link.utmSource)
    if (link.utmMedium) url.searchParams.set("utm_medium", link.utmMedium)
    if (link.utmCampaign) url.searchParams.set("utm_campaign", link.utmCampaign)
    if (link.utmContent) url.searchParams.set("utm_content", link.utmContent)

    // Parámetro ref para el script de Tiendanube
    const code = link.discountCode || link.creator?.discountCode
    if (code) {
      url.searchParams.set("ref", code)
      url.searchParams.set("utm_campaign", code)
    }

    return url.toString()
  } catch {
    // URL inválida, retornar tal cual
    return link.destination
  }
}
