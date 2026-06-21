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

const strip = (v?: string) => v?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? ""
const SHORT_DOMAIN = strip(env.NEXT_PUBLIC_SHORT_DOMAIN) || "joinkool.co"
const APP_DOMAIN = strip(env.NEXT_PUBLIC_APP_DOMAIN)
const CREATOR_DOMAIN = strip(env.NEXT_PUBLIC_CREATOR_DOMAIN)

function hostRedirect(req: Request): NextResponse | null {
  const rawHost = req.headers.get("host")?.split(":")[0]
  if (!rawHost) return null
  const host = rawHost.replace(/^www\./, "") // normalizar www

  const url = new URL(req.url)

  // Short link domain (joinkool.co) — siempre activo si SHORT_DOMAIN está seteado
  if (SHORT_DOMAIN && host === SHORT_DOMAIN) {
    const slug = url.pathname.slice(1) // strip leading /
    if (slug && !slug.includes("/")) {
      // Rewrite interno → /api/r/{slug}, el browser sigue viendo joinkool.co/{slug}
      return NextResponse.rewrite(new URL(`/api/r/${slug}${url.search}`, req.url))
    }
    // Raíz joinkool.co/ → redirigir al app solo si es un dominio distinto
    if (APP_DOMAIN && APP_DOMAIN !== SHORT_DOMAIN) {
      return NextResponse.redirect(`https://${APP_DOMAIN}${url.search}`)
    }
    return null
  }

  // Si no hay APP_DOMAIN, el resto del routing multi-host está desactivado
  if (!APP_DOMAIN) return null
  if (host === APP_DOMAIN) return null

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
