import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ProductionType, LocalStage, ImportStage } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { notFound, handleError } from "@/lib/api/response"

const UpdateProductSchema = z.object({
  productionStage: z.string().optional(),
  importStage: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().nullish(),
  image: z.string().nullish(),
  price: z.coerce.number().optional(),
  unitCost: z.coerce.number().optional(),
  initialStock: z.coerce.number().optional(),
  productionType: z.string().optional(),
  tiendanubeProductId: z.string().nullish(),
  tiendanubeVariantId: z.string().nullish(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id, productId } = await params

    // Verificar que el producto pertenece a un drop de este workspace
    const product = await prisma.dropProduct.findFirst({
      where: { id: productId, drop: { id, workspaceId } },
    })
    if (!product) return notFound()

    const body = await request.json()
    const data = UpdateProductSchema.parse(body)

    const updated = await prisma.dropProduct.update({
      where: { id: productId },
      data: {
        // Etapas de producción
        ...(data.productionStage !== undefined && {
          productionStage: data.productionStage as LocalStage,
        }),
        ...(data.importStage !== undefined && { importStage: data.importStage as ImportStage }),
        // Datos del producto
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.price !== undefined && { price: Number(data.price) }),
        ...(data.unitCost !== undefined && { unitCost: Number(data.unitCost) }),
        ...(data.initialStock !== undefined && { initialStock: Number(data.initialStock) }),
        ...(data.productionType !== undefined && {
          productionType: data.productionType as ProductionType,
        }),
        // TN connection
        ...(data.tiendanubeProductId !== undefined && {
          tiendanubeProductId: data.tiendanubeProductId,
        }),
        ...(data.tiendanubeVariantId !== undefined && {
          tiendanubeVariantId: data.tiendanubeVariantId,
        }),
      },
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    return handleError("[Drops] PATCH /api/drops/[id]/products/[productId]", error)
  }
}
