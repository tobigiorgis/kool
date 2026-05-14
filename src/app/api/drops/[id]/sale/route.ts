import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getSaleStats } from "@/lib/drops/sales"

type Params = { params: Promise<{ id: string }> }

async function authorize(userId: string, dropId: string) {
  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    include: { workspace: { include: { members: { where: { userId } } } } },
  })
  if (!drop || drop.workspace.members.length === 0) return null
  return drop
}

// GET — stats del sale
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dropId } = await params
  const drop = await authorize(userId, dropId)
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const stats = await getSaleStats(dropId)
  return NextResponse.json(stats)
}

// POST — crear sale
export async function POST(request: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dropId } = await params
  const drop = await authorize(userId, dropId)
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await prisma.dropSale.findUnique({ where: { dropId } })
  if (existing) {
    return NextResponse.json(
      { error: "Este Drop ya tiene un sale. Solo se permite uno por Drop." },
      { status: 409 }
    )
  }

  const body = await request.json()

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.dropSale.create({
      data: {
        dropId,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        generalDiscountPct: body.generalDiscountPct ?? null,
        notes: body.notes ?? null,
        status: "SCHEDULED",
      },
    })

    if (Array.isArray(body.productDiscounts)) {
      for (const pd of body.productDiscounts) {
        if (!pd.discountPct) continue
        const product = await tx.dropProduct.findUnique({ where: { id: pd.dropProductId } })
        if (!product) continue
        await tx.dropSaleProduct.create({
          data: {
            saleId: newSale.id,
            dropProductId: pd.dropProductId,
            discountPct: pd.discountPct,
            originalPrice: product.price,
            salePrice: product.price * (1 - pd.discountPct / 100),
          },
        })
      }
    }

    return tx.dropSale.findUnique({
      where: { id: newSale.id },
      include: { productDiscounts: { include: { dropProduct: true } } },
    })
  })

  return NextResponse.json({ ok: true, sale })
}

// PATCH — editar sale
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dropId } = await params
  const drop = await authorize(userId, dropId)
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()

  const sale = await prisma.dropSale.update({
    where: { dropId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
      ...(body.generalDiscountPct !== undefined && { generalDiscountPct: body.generalDiscountPct }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })

  if (Array.isArray(body.productDiscounts)) {
    await prisma.dropSaleProduct.deleteMany({ where: { saleId: sale.id } })
    for (const pd of body.productDiscounts) {
      if (!pd.discountPct) continue
      const product = await prisma.dropProduct.findUnique({ where: { id: pd.dropProductId } })
      if (!product) continue
      await prisma.dropSaleProduct.create({
        data: {
          saleId: sale.id,
          dropProductId: pd.dropProductId,
          discountPct: pd.discountPct,
          originalPrice: product.price,
          salePrice: product.price * (1 - pd.discountPct / 100),
        },
      })
    }
  }

  return NextResponse.json({ ok: true, sale })
}

// DELETE — eliminar sale
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: dropId } = await params
  const drop = await authorize(userId, dropId)
  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.dropSale.delete({ where: { dropId } })
  return NextResponse.json({ ok: true })
}
