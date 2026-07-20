import { prisma } from "@/lib/prisma"
import { createTiendanubeCoupon } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { logger } from "@/lib/logger"

/**
 * Crea el cupón de un código de descuento en la tienda Tiendanube del workspace.
 *
 * Es el ÚNICO lugar por el que debería pasar la creación de cupones: cada vez
 * que en Kool se le asigna un `discountCode` a un creator o CampaignCreator, hay
 * que llamar a esto para que el cupón exista de verdad en la tienda (si no, el
 * código es "fantasma" y las ventas nunca se atribuyen).
 *
 * - No-op si no hay código, o si el workspace no tiene una conexión TN activa.
 * - Idempotente: si el cupón ya existe, Tiendanube devuelve 422 y lo ignoramos.
 * - Nunca lanza: loguea el error y sigue, para no romper el flujo que lo llama.
 *
 * @param discountPct % de descuento AL CLIENTE (distinto de la comisión del
 *   creator). Si es null/0 no se crea el cupón — un cupón de 0% no tiene sentido.
 */
export async function ensureTiendanubeCoupon(params: {
  workspaceId: string
  code?: string | null
  discountPct?: number | null
}): Promise<void> {
  const { workspaceId, code, discountPct } = params

  if (!code || !discountPct || discountPct <= 0) return

  const connection = await prisma.tiendanubeConnection.findUnique({
    where: { workspaceId },
  })
  if (!connection?.active) return

  try {
    await createTiendanubeCoupon(connection.storeId, decrypt(connection.accessToken), {
      code,
      type: "percentage",
      value: discountPct,
      valid: true,
    })
  } catch (error) {
    // 422 = el cupón ya existe en la tienda. No es un error real (idempotencia).
    if (!(error instanceof Error) || !error.message.includes("422")) {
      logger.error("[Coupon] ensureTiendanubeCoupon", error)
    }
  }
}
