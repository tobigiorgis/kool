import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { env } from "@/lib/env"

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/onboarding/creator(.*)", // Onboarding de creators — token como auth
  "/apply/(.*)", // Landing pública de aplicación
  "/api/apply/(.*)", // API pública de aplicación
  "/api/r/(.*)", // Shortlink redirects — público
  "/api/webhooks/(.*)", // Webhooks de Tiendanube — público
  "/api/onboarding/creator(.*)", // API de onboarding creator — público
  "/scripts/(.*)", // Script de tracking — público
])

// Rutas que en el host del creator se sirven 1:1 desde la raíz física (NO se les
// antepone /creator). Distinto de isPublicRoute: /onboarding (marca) está protegida
// pero igual debe pasar derecho, y /privacy /support no son "públicas" de Clerk.
const isCreatorPassthrough = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/onboarding(.*)", // cubre /onboarding y /onboarding/creator
  "/apply(.*)",
  "/api/(.*)",
  "/scripts/(.*)",
  "/privacy(.*)",
  "/support(.*)",
])

// ─── Routing por host (multi-dominio) ───────────────────────────────
// INERTE hasta que los NEXT_PUBLIC_*_DOMAIN estén seteados. Con los envs
// vacíos, el comportamiento es idéntico al de un solo dominio.
//
//   · joinkool.co            → redirect a app.joinkool.co (mismo path)
//   · app.joinkool.co        → app / dashboard de marca (canónico)
//   · creator.joinkool.co    → portal de creators NATIVO: rewrite host/<x>
//                              → /creator/<x> (URL limpia, sin prefijo visible)
//   · refer.joinkool.co         → shortlinks → /api/r/<slug>
//
// La sesión de Clerk se comparte entre subdominios del mismo root
// automáticamente (no hace falta "satellite domain"). Ver DOMAINS.md.
// Normaliza el dominio: saca https:// y / final, por si la env var en Vercel
// quedó como "https://joinkool.co/". Sin esto, `host === DOMAIN` nunca matchea
// (el host del request viene sin protocolo) y el routing por host no dispara.
const stripHost = (v?: string) => v?.replace(/^https?:\/\//, "").replace(/\/+$/, "") || undefined
const ROOT_DOMAIN = stripHost(env.NEXT_PUBLIC_ROOT_DOMAIN) // joinkool.co
const APP_DOMAIN = stripHost(env.NEXT_PUBLIC_APP_DOMAIN) // app.joinkool.co
const CREATOR_DOMAIN = stripHost(env.NEXT_PUBLIC_CREATOR_DOMAIN) // creator.joinkool.co
const SHORT_DOMAIN = stripHost(env.NEXT_PUBLIC_SHORT_DOMAIN) // refer.joinkool.co
// Hosts que sirven shortlinks. Incluye el legacy kool.link para que los links
// ya compartidos sigan resolviendo durante la transición.
const SHORT_HOSTS = new Set([SHORT_DOMAIN, "kool.link"])

// Un slug de shortlink es UN solo segmento alfanumérico (sin `/` interno).
const SLUG_RE = /^\/[A-Za-z0-9_-]+$/

// ─── Shortlinks por host ────────────────────────────────────────────
// El middleware corre ANTES de los rewrites de next.config, así que un
// `refer.joinkool.co/<slug>` llega acá como path `/<slug>` — que NO es ruta
// pública → `auth.protect()` lo rebotaría al login de Clerk. Por eso lo
// resolvemos acá: reescribimos a /api/r/<slug> (público) y cortamos antes
// del auth. Esto arregla el "el link no llega a la tienda / tarda".
function shortlinkRewrite(req: Request): NextResponse | null {
  const host = req.headers.get("host")?.split(":")[0]
  if (!host || !SHORT_HOSTS.has(host)) return null

  const url = new URL(req.url)
  // Raíz del dominio corto → no es un slug; mandamos al sitio.
  if (url.pathname === "/") {
    return NextResponse.redirect(env.NEXT_PUBLIC_APP_URL)
  }
  if (!SLUG_RE.test(url.pathname)) return null

  url.pathname = `/api/r${url.pathname}`
  return NextResponse.rewrite(url)
}

// Apex (joinkool.co) → app canónica, preservando path. Gateado en APP_DOMAIN.
function apexRedirect(req: Request): NextResponse | null {
  if (!APP_DOMAIN || !ROOT_DOMAIN) return null
  const host = req.headers.get("host")?.split(":")[0]
  if (!host || host !== ROOT_DOMAIN) return null
  const url = new URL(req.url)
  return NextResponse.redirect(`https://${APP_DOMAIN}${url.pathname}${url.search}`)
}

const isAsset = (p: string) => p.startsWith("/_next") || /\.[^/]+$/.test(p)

// ¿Es una request al host del creator que hay que reescribir a /creator/*?
// Devuelve el rewrite (sirviendo el portal con URL limpia) o null.
// Las páginas del creator NO son públicas → el caller corre auth.protect antes.
function creatorRewrite(req: NextRequest): NextResponse | null {
  if (!CREATOR_DOMAIN) return null // nativo desactivado (dev single-domain)
  const host = req.headers.get("host")?.split(":")[0]
  if (!host || host !== CREATOR_DOMAIN) return null

  const url = new URL(req.url)
  const path = url.pathname
  // Rutas compartidas/asset → se sirven tal cual (sin prefijo /creator).
  if (isAsset(path) || isCreatorPassthrough(req)) return null

  url.pathname = path === "/" ? "/creator" : `/creator${path}`
  return NextResponse.rewrite(url) // preserva url.search (incluye ?_rsc)
}

// authorizedParties: lockea el audience de Clerk a los orígenes conocidos.
// Incluye SHORT_DOMAIN (refer.joinkool.co) aunque no tenga login propio: al ser
// subdominio de joinkool.co comparte la cookie de sesión de Clerk, así que el
// middleware intenta validarla en cada request — sin esto tira "Invalid JWT
// Authorized party claim (azp)" para requests al dominio de shortlinks.
// undefined en dev (sin domains) para no romper localhost.
const authorizedParties = [APP_DOMAIN, CREATOR_DOMAIN, SHORT_DOMAIN]
  .filter(Boolean)
  .map((d) => `https://${d}`)

export default clerkMiddleware(
  async (auth, req) => {
    // 1) Shortlinks del dominio corto → rewrite a /api/r/<slug> (antes del auth).
    const shortlink = shortlinkRewrite(req)
    if (shortlink) return shortlink

    // 2) Apex → app canónica.
    const apex = apexRedirect(req)
    if (apex) return apex

    // 3) Host del creator → servir /creator/* nativo (URL limpia). Auth primero:
    //    el path visible (/programs) no es público, así que protegemos y reescribimos.
    const creator = creatorRewrite(req)
    if (creator) {
      await auth.protect()
      return creator
    }

    // 4) Host app: protección normal.
    if (!isPublicRoute(req)) {
      await auth.protect()
    }
  },
  { authorizedParties: authorizedParties.length ? authorizedParties : undefined }
)

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
