import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { getTiendanubeScripts, getTiendanubeWebhooks } from "@/lib/tiendanube"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "missing workspaceId" }, { status: 400 })

  const connection = await prisma.tiendanubeConnection.findUnique({
    where: { workspaceId },
  })
  if (!connection) return NextResponse.json({ error: "no connection" }, { status: 404 })

  const accessToken = decrypt(connection.accessToken)

  // Usa el cliente compartido (Authorization: Bearer) en vez de fetch ad-hoc
  const [scripts, webhooks] = await Promise.all([
    getTiendanubeScripts(connection.storeId, accessToken).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    })),
    getTiendanubeWebhooks(connection.storeId, accessToken).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    })),
  ])

  return NextResponse.json({ scripts, webhooks, storeId: connection.storeId })
}
