import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { ok, notFound, handleError } from "@/lib/api/response"

const UpdateDebtSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce.number().optional(),
  creditor: z.string().nullish(),
  dueDate: z.string().nullish(),
  notes: z.string().nullish(),
  priority: z.coerce.number().optional(),
  paid: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; debtId: string }> }
) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id, debtId } = await params

    const debt = await prisma.dropDebt.findFirst({
      where: { id: debtId, drop: { id, workspaceId } },
    })
    if (!debt) return notFound()

    const body = await request.json()
    const data = UpdateDebtSchema.parse(body)

    // Toggle paid only
    if (Object.keys(body).length === 1 && "paid" in body) {
      const updated = await prisma.dropDebt.update({
        where: { id: debtId },
        data: { paidAt: data.paid ? new Date() : null },
      })
      return ok({ debt: updated })
    }

    // Full edit
    const { description, amount, creditor, dueDate, notes, priority, paid } = data

    const updated = await prisma.dropDebt.update({
      where: { id: debtId },
      data: {
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(creditor !== undefined && { creditor: creditor || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(priority !== undefined && { priority: Number(priority) }),
        ...(paid !== undefined && { paidAt: paid ? new Date() : null }),
      },
    })

    return ok({ debt: updated })
  } catch (error) {
    return handleError("[Drops] PATCH /api/drops/[id]/debts/[debtId]", error)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; debtId: string }> }
) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id, debtId } = await params

    await prisma.dropDebt.deleteMany({
      where: { id: debtId, drop: { id, workspaceId } },
    })

    return ok()
  } catch (error) {
    return handleError("[Drops] DELETE /api/drops/[id]/debts/[debtId]", error)
  }
}
