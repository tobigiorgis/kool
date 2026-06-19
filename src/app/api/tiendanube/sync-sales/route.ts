/**
 * POST /api/tiendanube/sync-sales
 * Jala las últimas órdenes pagadas de Tiendanube y registra en Kool
 * las ventas de DropProducts que no hayan sido registradas aún.
 */

import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getTiendanubeOrders } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { z } from "zod"
import { ok, fail, unauthorized, handleError } from "@/lib/api/response"

const SyncSalesSchema = z.object({
  workspaceId: z.string(),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  try {
    const body = await request.json().catch(() => ({}))
    const { workspaceId } = SyncSalesSchema.parse(body)

    const member = await prisma.workspaceMember.findFirst({ where: { userId, workspaceId } })
    if (!member) return fail("Forbidden", 403)

    const connection = await prisma.tiendanubeConnection.findUnique({ where: { workspaceId } })
    if (!connection?.active) return fail("Tiendanube not connected", 422)

    const accessToken = decrypt(connection.accessToken)

    // Traer las últimas 50 órdenes pagadas de TN
    const orders = await getTiendanubeOrders(connection.storeId, accessToken, {
      payment_status: "paid",
      per_page: 50,
    })

    // Obtener todos los drop products conectados de este workspace
    const dropProducts = await prisma.dropProduct.findMany({
      where: {
        drop: { workspaceId },
        OR: [{ tiendanubeProductId: { not: null } }, { tiendanubeVariantId: { not: null } }],
      },
      include: { drop: { select: { id: true, status: true, launchDate: true } } },
    })

    let created = 0
    let skipped = 0

    for (const order of orders) {
      const orderId = order.id.toString()
      const orderProducts = (order as any).products ?? []
      const orderDate = new Date(order.paid_at || order.created_at)

      for (const op of orderProducts) {
        const productIdStr = op.product_id?.toString()
        const variantIdStr = op.variant_id?.toString()

        // Buscar el drop product que coincide
        const dropProduct = dropProducts.find(
          (dp) =>
            (productIdStr && dp.tiendanubeProductId === productIdStr) ||
            (variantIdStr && dp.tiendanubeVariantId === variantIdStr)
        )

        if (!dropProduct) continue

        // Solo contar ventas desde la fecha de lanzamiento del drop
        if (orderDate < dropProduct.drop.launchDate) {
          skipped++
          continue
        }

        // Verificar que ya no existe esta venta para este orderId + dropProduct
        const existing = await prisma.dropProductSale.findFirst({
          where: { dropProductId: dropProduct.id, orderId },
        })

        if (existing) {
          skipped++
          continue
        }

        const qty = op.quantity || 1
        const unitPrice = parseFloat(op.price || "0")

        await prisma.dropProductSale.create({
          data: {
            dropProductId: dropProduct.id,
            conversionId: null,
            quantity: qty,
            unitPrice,
            totalAmount: unitPrice * qty,
            orderId,
          },
        })
        created++
      }
    }

    return ok({
      ordersChecked: orders.length,
      salesCreated: created,
      salesSkipped: skipped,
    })
  } catch (error) {
    return handleError("[SyncSales] POST", error)
  }
}
