import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { getTiendanubeScripts, getTiendanubeWebhooks } from "@/lib/tiendanube"
import { fail, unauthorized, handleError } from "@/lib/api/response"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return unauthorized()

    const workspaceId = request.nextUrl.searchParams.get("workspaceId")
    if (!workspaceId) return fail("missing workspaceId", 400)

    const connection = await prisma.tiendanubeConnection.findUnique({
      where: { workspaceId },
    })
    if (!connection) return fail("no connection", 404)

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
  } catch (error) {
    return handleError("[Debug] tiendanube-scripts", error)
  }
}
