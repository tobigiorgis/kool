import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/onboarding/creator(.*)",        // Onboarding de creators — token como auth
  "/apply/(.*)",                    // Landing pública de aplicación
  "/api/apply/(.*)",                // API pública de aplicación
  "/api/r/(.*)",                    // Shortlink redirects — público
  "/api/webhooks/(.*)",             // Webhooks de Tiendanube — público
  "/api/onboarding/creator(.*)",    // API de onboarding creator — público
  "/scripts/(.*)",                  // Script de tracking — público
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
