import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/api/r/(.*)",                    // Shortlink redirects — público
  "/api/webhooks/(.*)",             // Webhooks de Tiendanube — público
  "/scripts/(.*)",                  // Script de tracking — público
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
