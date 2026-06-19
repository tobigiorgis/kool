import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { registerTiendanubeWebhooks } from "@/lib/tiendanube"
import { ok, fail, unauthorized, handleError } from "@/lib/api/response"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return unauthorized()

    if (process.env.NODE_ENV === "production") return fail("Not found", 404)

    const { workspaceId } = await request.json()

    const connection = await prisma.tiendanubeConnection.findUnique({
      where: { workspaceId },
    })
    if (!connection) return fail("no connection", 404)

    const accessToken = decrypt(connection.accessToken)

    const webhookResult = await registerTiendanubeWebhooks(connection.storeId, accessToken)
    logger.info("[Debug] check-connection", "Webhook result", { webhookResult })

    return ok({ webhookResult })
  } catch (error) {
    return handleError("[Debug] check-connection", error)
  }
}
