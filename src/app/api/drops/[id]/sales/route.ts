/**
 * DELETE /api/drops/[id]/sales
 * Borra todas las DropProductSales de un drop (para re-sincronizar desde cero).
 */

import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ok, unauthorized, notFound, handleError } from "@/lib/api/response"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return unauthorized()

    const { id: dropId } = await params

    // Verificar que el drop pertenece a un workspace del usuario
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      include: { workspace: { include: { members: { where: { userId } } } } },
    })

    if (!drop || drop.workspace.members.length === 0) {
      return notFound()
    }

    // Borrar todas las ventas de los productos de este drop
    const result = await prisma.dropProductSale.deleteMany({
      where: {
        dropProduct: { dropId },
      },
    })

    return ok({ deleted: result.count })
  } catch (error) {
    return handleError("[Drops] DELETE /api/drops/[id]/sales", error)
  }
}
