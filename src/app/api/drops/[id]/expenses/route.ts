import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ExpenseCategory, ExpenseScope } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { notFound, handleError } from "@/lib/api/response"

const CreateExpenseSchema = z.object({
  amount: z.coerce.number(),
  currency: z.string().nullish(),
  date: z.string(),
  category: z.string(),
  notes: z.string().nullish(),
  scope: z.string().nullish(),
  productIds: z.array(z.string()).nullish(),
  isDebt: z.boolean().nullish(),
  creditor: z.string().nullish(),
  dueDate: z.string().nullish(),
})

const DeleteExpenseSchema = z.object({
  expenseId: z.string(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params

    const drop = await prisma.drop.findFirst({ where: { id, workspaceId } })
    if (!drop) return notFound()

    const expenses = await prisma.expense.findMany({
      where: { dropId: id },
      include: {
        assignments: {
          include: { dropProduct: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    return handleError("[Drops] GET /api/drops/[id]/expenses", error)
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
    // productIds: string[] — solo si scope === "PRODUCTS"
    const {
      amount,
      currency,
      date,
      category,
      notes,
      scope,
      productIds,
      isDebt,
      creditor,
      dueDate,
    } = CreateExpenseSchema.parse(body)

    const expense = await prisma.expense.create({
      data: {
        dropId: id,
        amount: Number(amount),
        currency: currency || "ARS",
        date: new Date(date),
        category: category as ExpenseCategory,
        notes: notes || null,
        scope: (scope || "DROP") as ExpenseScope,
        isDebt: isDebt || false,
        creditor: isDebt && creditor ? creditor : null,
        dueDate: isDebt && dueDate ? new Date(dueDate) : null,
        assignments:
          scope === "PRODUCTS" && productIds?.length
            ? {
                create: productIds.map((pid: string) => ({ dropProductId: pid })),
              }
            : undefined,
      },
      include: {
        assignments: {
          include: { dropProduct: { select: { id: true, name: true } } },
        },
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    return handleError("[Drops] POST /api/drops/[id]/expenses", error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params
    const { expenseId } = DeleteExpenseSchema.parse(await request.json())

    // Verify the expense belongs to this drop which belongs to this workspace
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, dropId: id, drop: { workspaceId } },
    })
    if (!expense) return notFound()

    await prisma.expense.delete({ where: { id: expenseId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError("[Drops] DELETE /api/drops/[id]/expenses", error)
  }
}
