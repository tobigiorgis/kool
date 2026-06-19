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
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/login", env.NEXT_PUBLIC_APP_URL))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  logger.info("[Tiendanube OAuth] Callback received", "received", {
    hasCode: !!code,
    state,
    userId,
  })

  if (!code) {
    logger.error("[Tiendanube OAuth] Missing code", "missing_code")
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=tiendanube_auth_failed", env.NEXT_PUBLIC_APP_URL)
    )
  }

  // Resolver workspaceId: usar state si es un cuid válido, sino buscar por userId
  let workspaceId = state && state.length > 10 && state !== "TEST" ? state : null

  if (!workspaceId) {
    logger.info("[Tiendanube OAuth]", "state no es un workspaceId válido, buscando por userId")
    const member = await prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
    })
    workspaceId = member?.workspaceId ?? null
    logger.info("[Tiendanube OAuth] workspaceId encontrado", "workspace_resolved", { workspaceId })
  }

  if (!workspaceId) {
    logger.error("[Tiendanube OAuth] No se encontró workspace", "no_workspace", { userId })
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=tiendanube_auth_failed", env.NEXT_PUBLIC_APP_URL)
    )
  }

  try {
    // 1. Intercambiar código por access token
    logger.info("[Tiendanube OAuth] Exchanging code", "exchange", { code })
    const tokenData = await exchangeTiendanubeCode(code)
    const storeId = tokenData.user_id.toString()
    logger.info("[Tiendanube OAuth] Token received", "token_received", {
      storeId,
      access_token: tokenData.access_token,
    })

    // 2. Obtener info de la tienda
    const store = await getTiendanubeStore(storeId, tokenData.access_token)
    logger.info("[Tiendanube OAuth] Store info", "store_info", { store })

    // 3. Guardar la conexión en la base de datos (token encriptado)
    logger.info("[Tiendanube OAuth] ENCRYPTION_KEY set", "encryption_check", {
      hasEncryptionKey: !!env.ENCRYPTION_KEY,
    })
    const encryptedToken = encrypt(tokenData.access_token)
    const storeName =
      typeof store.name === "object"
        ? (store.name as Record<string, string>).es ||
          Object.values(store.name as Record<string, string>)[0]
        : store.name

    logger.info("[Tiendanube OAuth] Saving to DB", "db_save", { workspaceId })
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
    logger.info("[Tiendanube OAuth] DB saved OK", "db_saved")

    // 4. Registrar webhooks
    logger.info("[Tiendanube OAuth] Registering webhooks", "webhooks_register")
    try {
      const webhookResults = await registerTiendanubeWebhooks(storeId, tokenData.access_token)
      logger.info("[Tiendanube OAuth] Webhooks registered", "webhooks_registered", {
        webhookResults,
      })
    } catch (err) {
      logger.error("[Tiendanube OAuth] Webhook registration failed", err)
    }

    logger.info("[Tiendanube OAuth] Done", "done")

    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?tiendanube=connected&store=${encodeURIComponent(store.main_domain)}`,
        env.NEXT_PUBLIC_APP_URL
      )
    )
  } catch (error) {
    logger.error("[Tiendanube OAuth] Error", error)
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=tiendanube_connection_failed", env.NEXT_PUBLIC_APP_URL)
    )
  }
}
