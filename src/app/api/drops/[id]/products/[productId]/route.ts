import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

async function getWorkspaceId(userId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  })
  return member?.workspaceId ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id, productId } = await params

  // Verificar que el producto pertenece a un drop de este workspace
  const product = await prisma.dropProduct.findFirst({
    where: { id: productId, drop: { id, workspaceId } },
  })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()

  const updated = await prisma.dropProduct.update({
    where: { id: productId },
    data: {
      tiendanubeProductId: body.tiendanubeProductId ?? product.tiendanubeProductId,
      tiendanubeVariantId: body.tiendanubeVariantId ?? product.tiendanubeVariantId,
    },
  })

  return NextResponse.json({ product: updated })
}
