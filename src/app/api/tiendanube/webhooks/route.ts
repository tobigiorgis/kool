/**
 * GET  /api/tiendanube/webhooks — Lista los webhooks registrados en TN
 * POST /api/tiendanube/webhooks — Re-registra los webhooks necesarios
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getTiendanubeWebhooks, registerTiendanubeWebhooks } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { z } from "zod"
import { env } from "@/lib/env"
import { ok, fail, unauthorized, badRequest, handleError } from "@/lib/api/response"

const RegisterWebhooksSchema = z.object({
  workspaceId: z.string(),
})

async function getConnection(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findFirst({ where: { userId, workspaceId } })
  if (!member) return null
  return prisma.tiendanubeConnection.findUnique({ where: { workspaceId } })
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return badRequest("Missing workspaceId")

  try {
    const connection = await getConnection(userId, workspaceId)
    if (!connection?.active) return fail("Not connected", 422)

    const accessToken = decrypt(connection.accessToken)
    const webhooks = await getTiendanubeWebhooks(connection.storeId, accessToken)

    const expectedUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/tiendanube/order-paid`
    const isRegistered = webhooks.some((w) => w.event === "order/paid" && w.url === expectedUrl)

    return NextResponse.json({ webhooks, isRegistered, expectedUrl })
  } catch (error) {
    return handleError("[Webhooks] GET", error)
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  try {
    const body = await request.json()
    const { workspaceId } = RegisterWebhooksSchema.parse(body)

    const connection = await getConnection(userId, workspaceId)
    if (!connection?.active) return fail("Not connected", 422)

    const accessToken = decrypt(connection.accessToken)
    const results = await registerTiendanubeWebhooks(connection.storeId, accessToken)

    return ok({ results })
  } catch (error) {
    return handleError("[Webhooks] POST", error)
  }
}
