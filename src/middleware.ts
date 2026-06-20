import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
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

// ─── Routing por host (multi-dominio) ───────────────────────────────
// INERTE hasta que NEXT_PUBLIC_APP_DOMAIN esté seteado. Con los envs
// vacíos, el comportamiento es idéntico al de un solo dominio.
//
// v1 (actual): redirect-alias — el dominio canónico es APP_DOMAIN y los
// demás hosts redirigen hacia él (auth siempre en un único dominio Clerk).
//   · joinkool.co            → app.joinkool.co (mismo path)
//   · creator.joinkool.co    → app.joinkool.co/creator (entrada al portal)
//
// Upgrade futuro (subdominio nativo): servir el portal directamente en
// creator.joinkool.co requiere Clerk "satellite domain". Ver DOMAINS.md.
const ROOT_DOMAIN = env.NEXT_PUBLIC_ROOT_DOMAIN // joinkool.co
const APP_DOMAIN = env.NEXT_PUBLIC_APP_DOMAIN // app.joinkool.co
const CREATOR_DOMAIN = env.NEXT_PUBLIC_CREATOR_DOMAIN // creator.joinkool.co

function hostRedirect(req: Request): NextResponse | null {
  if (!APP_DOMAIN) return null // routing por host desactivado

  const host = req.headers.get("host")?.split(":")[0]
  if (!host || host === APP_DOMAIN) return null

  const url = new URL(req.url)

  // Apex (joinkool.co) → short link rewrite or → app
  if (ROOT_DOMAIN && host === ROOT_DOMAIN) {
    const slug = url.pathname.slice(1) // strip leading /
    // Single-segment non-empty path → treat as short link slug
    if (slug && !slug.includes("/")) {
      return NextResponse.rewrite(new URL(`/api/r/${slug}${url.search}`, req.url))
    }
    return NextResponse.redirect(`https://${APP_DOMAIN}${url.pathname}${url.search}`)
  }

  // creator.joinkool.co → app, "/" entra directo al portal
  if (CREATOR_DOMAIN && host === CREATOR_DOMAIN) {
    const dest = url.pathname === "/" ? "/creator" : url.pathname
    return NextResponse.redirect(`https://${APP_DOMAIN}${dest}${url.search}`)
  }

  return null
}

export default clerkMiddleware(async (auth, req) => {
  const redirect = hostRedirect(req)
  if (redirect) return redirect

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
