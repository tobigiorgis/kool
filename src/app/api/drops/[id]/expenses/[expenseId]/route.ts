import { NextRequest } from "next/server"
import { z } from "zod"
import { ExpenseCategory, ExpenseScope } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { ok, notFound, handleError } from "@/lib/api/response"

const UpdateExpenseSchema = z.object({
  amount: z.coerce.number().optional(),
  date: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().nullish(),
  scope: z.string().optional(),
  productIds: z.array(z.string()).nullish(),
  isDebt: z.boolean().optional(),
  creditor: z.string().nullish(),
  dueDate: z.string().nullish(),
  paid: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id, expenseId } = await params

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, drop: { id, workspaceId } },
    })
    if (!expense) return notFound()

    const body = await request.json()
    const data = UpdateExpenseSchema.parse(body)

    // Toggle paid (from financials debt list)
    if ("paid" in body) {
      const updated = await prisma.expense.update({
        where: { id: expenseId },
        data: { paidAt: data.paid ? new Date() : null },
      })
      return ok({ expense: updated })
    }

    // Full edit
    const { amount, date, category, notes, scope, productIds, isDebt, creditor, dueDate } = data

    // Rebuild assignments if scope/productIds changed
    if (scope !== undefined) {
      await prisma.expenseAssignment.deleteMany({ where: { expenseId } })
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(category !== undefined && { category: category as ExpenseCategory }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(scope !== undefined && { scope: scope as ExpenseScope }),
        ...(isDebt !== undefined && { isDebt }),
        ...(isDebt !== undefined && { creditor: isDebt && creditor ? creditor : null }),
        ...(isDebt !== undefined && { dueDate: isDebt && dueDate ? new Date(dueDate) : null }),
        ...(scope === "PRODUCTS" &&
          productIds?.length && {
            assignments: {
              create: productIds.map((pid: string) => ({ dropProductId: pid })),
            },
          }),
      },
      include: {
        assignments: {
          include: { dropProduct: { select: { id: true, name: true } } },
        },
      },
    })

    return ok({ expense: updated })
  } catch (error) {
    return handleError("[Drops] PATCH /api/drops/[id]/expenses/[expenseId]", error)
  }
}
