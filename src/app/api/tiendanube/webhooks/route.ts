/**
 * GET  /api/tiendanube/webhooks — Lista los webhooks registrados en TN
 * POST /api/tiendanube/webhooks — Re-registra los webhooks necesarios
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getTiendanubeWebhooks, registerTiendanubeWebhooks } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"

async function getConnection(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findFirst({ where: { userId, workspaceId } })
  if (!member) return null
  return prisma.tiendanubeConnection.findUnique({ where: { workspaceId } })
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const connection = await getConnection(userId, workspaceId)
  if (!connection?.active) return NextResponse.json({ error: "Not connected" }, { status: 422 })

  const accessToken = decrypt(connection.accessToken)
  const webhooks = await getTiendanubeWebhooks(connection.storeId, accessToken)

  const expectedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/tiendanube/order-paid`
  const isRegistered = webhooks.some(
    (w) => w.event === "order/paid" && w.url === expectedUrl
  )

  return NextResponse.json({ webhooks, isRegistered, expectedUrl })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { workspaceId } = await request.json()
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const connection = await getConnection(userId, workspaceId)
  if (!connection?.active) return NextResponse.json({ error: "Not connected" }, { status: 422 })

  const accessToken = decrypt(connection.accessToken)
  const results = await registerTiendanubeWebhooks(connection.storeId, accessToken)

  return NextResponse.json({ ok: true, results })
}
