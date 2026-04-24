import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { installTiendanubeScript, registerTiendanubeWebhooks } from "@/lib/tiendanube"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { workspaceId } = await request.json()

  const connection = await prisma.tiendanubeConnection.findUnique({
    where: { workspaceId },
  })
  if (!connection) return NextResponse.json({ error: "no connection" }, { status: 404 })

  const accessToken = decrypt(connection.accessToken)

  try {
    const scriptResult = await installTiendanubeScript(connection.storeId, accessToken)
    console.log("[Reinstall] Script result:", scriptResult)

    const webhookResult = await registerTiendanubeWebhooks(connection.storeId, accessToken)
    console.log("[Reinstall] Webhook result:", webhookResult)

    return NextResponse.json({ ok: true, scriptResult, webhookResult })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message })
  }
}
