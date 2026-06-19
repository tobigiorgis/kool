import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { SaleStatus } from "@prisma/client"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getSaleStats } from "@/lib/drops/sales"
import { ok, fail, unauthorized, notFound, handleError } from "@/lib/api/response"

type Params = { params: Promise<{ id: string }> }

const ProductDiscountSchema = z.object({
  dropProductId: z.string(),
  discountPct: z.coerce.number().nullish(),
})

const CreateSaleSchema = z.object({
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  generalDiscountPct: z.coerce.number().nullish(),
  notes: z.string().nullish(),
  productDiscounts: z.array(ProductDiscountSchema).nullish(),
})

const UpdateSaleSchema = z.object({
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  generalDiscountPct: z.coerce.number().nullish(),
  status: z.string().optional(),
  notes: z.string().nullish(),
  productDiscounts: z.array(ProductDiscountSchema).nullish(),
})

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
  try {
    const { userId } = await auth()
    if (!userId) return unauthorized()

    const { id: dropId } = await params
    const drop = await authorize(userId, dropId)
    if (!drop) return notFound()

    const stats = await getSaleStats(dropId)
    return NextResponse.json(stats)
  } catch (error) {
    return handleError("[Drops] GET /api/drops/[id]/sale", error)
  }
}

// POST — crear sale
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return unauthorized()

    const { id: dropId } = await params
    const drop = await authorize(userId, dropId)
    if (!drop) return notFound()

    const existing = await prisma.dropSale.findUnique({ where: { dropId } })
    if (existing) {
      return fail("Este Drop ya tiene un sale. Solo se permite uno por Drop.", 409)
    }

    const body = await request.json()
    const data = CreateSaleSchema.parse(body)

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.dropSale.create({
        data: {
          dropId,
          name: data.name,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          generalDiscountPct: data.generalDiscountPct ?? null,
          notes: data.notes ?? null,
          status: "SCHEDULED",
        },
      })

      if (Array.isArray(data.productDiscounts)) {
        for (const pd of data.productDiscounts) {
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

    return ok({ sale })
  } catch (error) {
    return handleError("[Drops] POST /api/drops/[id]/sale", error)
  }
}

// PATCH — editar sale
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return unauthorized()

    const { id: dropId } = await params
    const drop = await authorize(userId, dropId)
    if (!drop) return notFound()

    const body = await request.json()
    const data = UpdateSaleSchema.parse(body)

    const sale = await prisma.dropSale.update({
      where: { dropId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.generalDiscountPct !== undefined && {
          generalDiscountPct: data.generalDiscountPct,
        }),
        ...(data.status !== undefined && { status: data.status as SaleStatus }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    if (Array.isArray(data.productDiscounts)) {
      await prisma.dropSaleProduct.deleteMany({ where: { saleId: sale.id } })
      for (const pd of data.productDiscounts) {
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

    return ok({ sale })
  } catch (error) {
    return handleError("[Drops] PATCH /api/drops/[id]/sale", error)
  }
}

// DELETE — eliminar sale
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return unauthorized()

    const { id: dropId } = await params
    const drop = await authorize(userId, dropId)
    if (!drop) return notFound()

    await prisma.dropSale.delete({ where: { dropId } })
    return ok()
  } catch (error) {
    return handleError("[Drops] DELETE /api/drops/[id]/sale", error)
  }
}
