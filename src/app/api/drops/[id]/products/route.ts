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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id } = await params

  const drop = await prisma.drop.findFirst({ where: { id, workspaceId } })
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const products = await prisma.dropProduct.findMany({
    where: { dropId: id },
    include: { sales: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ products })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id } = await params

  const drop = await prisma.drop.findFirst({ where: { id, workspaceId } })
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()

  const product = await prisma.dropProduct.create({
    data: {
      dropId: id,
      name: body.name,
      description: body.description || null,
      image: body.image || null,
      sku: body.sku || null,
      price: Number(body.price),
      unitCost: Number(body.unitCost),
      initialStock: Number(body.initialStock),
      tiendanubeProductId: body.tiendanubeProductId || null,
      tiendanubeVariantId: body.tiendanubeVariantId || null,
    },
  })

  return NextResponse.json({ product }, { status: 201 })
}
