import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { notFound, handleError } from "@/lib/api/response"

const CreateProductSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  image: z.string().nullish(),
  sku: z.string().nullish(),
  price: z.coerce.number(),
  unitCost: z.coerce.number(),
  initialStock: z.coerce.number(),
  productionType: z.string().nullish(),
  tiendanubeProductId: z.string().nullish(),
  tiendanubeVariantId: z.string().nullish(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params

    const drop = await prisma.drop.findFirst({ where: { id, workspaceId } })
    if (!drop) return notFound()

    const products = await prisma.dropProduct.findMany({
      where: { dropId: id },
      include: { sales: true },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ products })
  } catch (error) {
    return handleError("[Drops] GET /api/drops/[id]/products", error)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params

    const drop = await prisma.drop.findFirst({ where: { id, workspaceId } })
    if (!drop) return notFound()

    const body = await request.json()
    const data = CreateProductSchema.parse(body)

    const isImport = data.productionType === "IMPORT"

    const product = await prisma.dropProduct.create({
      data: {
        dropId: id,
        name: data.name,
        description: data.description || null,
        image: data.image || null,
        sku: data.sku || null,
        price: Number(data.price),
        unitCost: Number(data.unitCost),
        initialStock: Number(data.initialStock),
        productionType: isImport ? "IMPORT" : "LOCAL",
        productionStage: isImport ? null : "NOT_STARTED",
        importStage: isImport ? "NOT_STARTED" : null,
        tiendanubeProductId: data.tiendanubeProductId || null,
        tiendanubeVariantId: data.tiendanubeVariantId || null,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    return handleError("[Drops] POST /api/drops/[id]/products", error)
  }
}
