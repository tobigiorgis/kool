import { env } from "@/lib/env"

/**
 * Helpers de routing multi-host (ver DOMAINS.md).
 *
 * El portal de creators vive físicamente en src/app/creator/*. En producción se
 * sirve nativo en creator.joinkool.co con URL limpia (sin el prefijo /creator):
 * el middleware reescribe creator.joinkool.co/<x> → /creator/<x>.
 *
 * Para que los links internos funcionen IGUAL en dev (localhost, con prefijo) y
 * en prod (host creator, limpio), la nav se arma con estos helpers en vez de
 * strings literales. Si NEXT_PUBLIC_CREATOR_DOMAIN no está seteado (dev), todo
 * cae a paths relativos con /creator → comportamiento idéntico al actual.
 */

const APP_DOMAIN = env.NEXT_PUBLIC_APP_DOMAIN
const CREATOR_DOMAIN = env.NEXT_PUBLIC_CREATOR_DOMAIN

function strip(sub: string): string {
  return sub.replace(/^\/+/, "")
}

/**
 * Path RELATIVO para navegar DENTRO del host del creator.
 * Prod (CREATOR_DOMAIN seteado): "/sub" (limpio; el middleware re-agrega /creator).
 * Dev: "/creator/sub".
 */
export function creatorPath(sub = ""): string {
  const clean = strip(sub)
  if (CREATOR_DOMAIN) return clean ? `/${clean}` : "/"
  return clean ? `/creator/${clean}` : "/creator"
}

/**
 * URL ABSOLUTA al host del creator (para cruces de host: afterSignIn, emails,
 * canonicalización). Dev: path relativo "/creator/sub".
 */
export function creatorUrl(sub = ""): string {
  const clean = strip(sub)
  if (CREATOR_DOMAIN)
    return clean ? `https://${CREATOR_DOMAIN}/${clean}` : `https://${CREATOR_DOMAIN}`
  return clean ? `/creator/${clean}` : "/creator"
}

/**
 * URL ABSOLUTA al host de la app/marca. Dev: path relativo "/sub".
 */
export function appUrl(sub = ""): string {
  const clean = strip(sub)
  if (APP_DOMAIN) return clean ? `https://${APP_DOMAIN}/${clean}` : `https://${APP_DOMAIN}`
  return clean ? `/${clean}` : "/"
}

/** A dónde mandar tras autenticar, según rol, al host correcto. */
export function roleHomeUrl(role: "brand" | "creator"): string {
  return role === "creator" ? creatorUrl("") : appUrl("dashboard")
}
