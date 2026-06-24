import { env } from "@/lib/env"

/**
 * Dominio corto de los links de afiliado (ej. "refer.joinkool.co").
 * Configurable vía NEXT_PUBLIC_SHORT_DOMAIN; default "kool.link".
 */
export const SHORT_DOMAIN = env.NEXT_PUBLIC_SHORT_DOMAIN

/**
 * URL corta de un link de afiliado para mostrar/copiar (con protocolo).
 *   buildShortUrl("camila") → "https://refer.joinkool.co/camila"
 */
export function buildShortUrl(slug: string): string {
  return `https://${SHORT_DOMAIN}/${slug}`
}

/**
 * Versión sin protocolo, para mostrar en la UI (ej. "refer.joinkool.co/camila").
 */
export function shortUrlLabel(slug: string): string {
  return `${SHORT_DOMAIN}/${slug}`
}
