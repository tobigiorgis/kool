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
  installTiendanubeScript,
} from "@/lib/tiendanube"
import { encrypt } from "@/lib/utils/crypto"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state") // workspaceId que guardamos al iniciar el OAuth

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?error=tiendanube_auth_failed", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  try {
    // 1. Intercambiar código por access token
    const tokenData = await exchangeTiendanubeCode(code)
    const storeId = tokenData.user_id.toString()

    // 2. Obtener info de la tienda
    const store = await getTiendanubeStore(storeId, tokenData.access_token)

    // 3. Guardar la conexión en la base de datos
    // El access token se guarda encriptado
    const encryptedToken = encrypt(tokenData.access_token)

    await prisma.tiendanubeConnection.upsert({
      where: { workspaceId: state },
      create: {
        workspaceId: state,
        storeId,
        accessToken: encryptedToken,
        storeName: typeof store.name === "object"
          ? (store.name as any).es || Object.values(store.name)[0]
          : store.name,
        storeUrl: store.url,
        storeDomain: store.main_domain,
        active: true,
      },
      update: {
        storeId,
        accessToken: encryptedToken,
        storeName: typeof store.name === "object"
          ? (store.name as any).es || Object.values(store.name)[0]
          : store.name,
        storeUrl: store.url,
        storeDomain: store.main_domain,
        active: true,
      },
    })

    // 4. Registrar webhooks en la tienda (async, no bloqueamos)
    registerTiendanubeWebhooks(storeId, tokenData.access_token).catch(
      (err) => console.error("[TN Setup] Webhook registration failed:", err)
    )

    // 5. Instalar script de tracking en el storefront (async)
    installTiendanubeScript(storeId, tokenData.access_token).catch(
      (err) => console.error("[TN Setup] Script installation failed:", err)
    )

    // 6. Redirigir al dashboard con éxito
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?tiendanube=connected&store=${encodeURIComponent(store.main_domain)}`,
        process.env.NEXT_PUBLIC_APP_URL!
      )
    )
  } catch (error) {
    console.error("[TN OAuth] Error:", error)
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=tiendanube_connection_failed", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
