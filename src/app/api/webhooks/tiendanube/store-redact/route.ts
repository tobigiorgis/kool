import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const storeId = body.store_id?.toString()
    if (storeId) {
      await prisma.tiendanubeConnection.deleteMany({ where: { storeId } })
    }
    return Response.json({ ok: true })
  } catch (error) {
    logger.error("[Tiendanube LGPD] store-redact error", error)
    // Mantener el status de error actual (500) — no ACKeamos un redact que falló.
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}
