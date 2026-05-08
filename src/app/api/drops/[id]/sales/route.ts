/**
 * DELETE /api/drops/[id]/sales
 * Borra todas las DropProductSales de un drop (para re-sincronizar desde cero).
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dropId } = await params

  // Verificar que el drop pertenece a un workspace del usuario
  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    include: { workspace: { include: { members: { where: { userId } } } } },
  })

  if (!drop || drop.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Borrar todas las ventas de los productos de este drop
  const result = await prisma.dropProductSale.deleteMany({
    where: {
      dropProduct: { dropId },
    },
  })

  return NextResponse.json({ ok: true, deleted: result.count })
}
