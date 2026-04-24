/**
 * Kool — Tiendanube OAuth Callback
 * GET /api/auth/tiendanube/callback?code=XXX&state=YYY
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import {
  exchangeTiendanubeCode,
  getTiendanubeStore,
  registerTiendanubeWebhooks,
} from "@/lib/tiendanube"
import { encrypt } from "@/lib/utils/crypto"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  console.log("[TN Callback] Received code:", !!code, "state:", state, "userId:", userId)

  if (!code) {
    console.error("[TN Callback] Missing code")
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=tiendanube_auth_failed", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  // Resolver workspaceId: usar state si es un cuid válido, sino buscar por userId
  let workspaceId = state && state.length > 10 && state !== "TEST" ? state : null

  if (!workspaceId) {
    console.log("[TN Callback] state no es un workspaceId válido, buscando por userId...")
    const member = await prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
    })
    workspaceId = member?.workspaceId ?? null
    console.log("[TN Callback] workspaceId encontrado:", workspaceId)
  }

  if (!workspaceId) {
    console.error("[TN Callback] No se encontró workspace para userId:", userId)
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=tiendanube_auth_failed", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  try {
    // 1. Intercambiar código por access token
    console.log("[TN Callback] Exchanging code...")
    const tokenData = await exchangeTiendanubeCode(code)
    const storeId = tokenData.user_id.toString()
    console.log("[TN Callback] Token received, storeId:", storeId)

    // 2. Obtener info de la tienda
    const store = await getTiendanubeStore(storeId, tokenData.access_token)
    console.log("[TN Callback] Store info:", JSON.stringify(store))

    // 3. Guardar la conexión en la base de datos (token encriptado)
    console.log("[TN Callback] ENCRYPTION_KEY set:", !!process.env.ENCRYPTION_KEY)
    const encryptedToken = encrypt(tokenData.access_token)
    const storeName = typeof store.name === "object"
      ? (store.name as Record<string, string>).es || Object.values(store.name as Record<string, string>)[0]
      : store.name

    console.log("[TN Callback] Saving to DB, workspaceId:", workspaceId)
    await prisma.tiendanubeConnection.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        storeId,
        accessToken: encryptedToken,
        storeName,
        storeUrl: store.url,
        storeDomain: store.main_domain,
        active: true,
      },
      update: {
        storeId,
        accessToken: encryptedToken,
        storeName,
        storeUrl: store.url,
        storeDomain: store.main_domain,
        active: true,
      },
    })
    console.log("[TN Callback] DB saved OK")

    // 4. Registrar webhooks
    console.log("[TN Setup] Registering webhooks...")
    try {
      const webhookResults = await registerTiendanubeWebhooks(storeId, tokenData.access_token)
      console.log("[TN Setup] Webhooks registered:", JSON.stringify(webhookResults))
    } catch (err) {
      console.error("[TN Setup] Webhook registration failed:", err)
    }

    console.log("[TN Setup] Done")

    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?tiendanube=connected&store=${encodeURIComponent(store.main_domain)}`,
        process.env.NEXT_PUBLIC_APP_URL!
      )
    )
  } catch (error) {
    console.error("[TN OAuth] Error:", error instanceof Error ? error.message : error)
    console.error("[TN OAuth] Stack:", error instanceof Error ? error.stack : "")
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=tiendanube_connection_failed", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
