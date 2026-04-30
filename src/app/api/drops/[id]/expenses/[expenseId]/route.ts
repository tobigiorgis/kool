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
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id, expenseId } = await params

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, drop: { id, workspaceId } },
  })
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()

  // Toggle paid (from financials debt list)
  if ("paid" in body) {
    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: { paidAt: body.paid ? new Date() : null },
    })
    return NextResponse.json({ ok: true, expense: updated })
  }

  // Full edit
  const { amount, date, category, notes, scope, productIds, isDebt, creditor, dueDate } = body

  // Rebuild assignments if scope/productIds changed
  if (scope !== undefined) {
    await prisma.expenseAssignment.deleteMany({ where: { expenseId } })
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(category !== undefined && { category }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(scope !== undefined && { scope }),
      ...(isDebt !== undefined && { isDebt }),
      ...(isDebt !== undefined && { creditor: isDebt && creditor ? creditor : null }),
      ...(isDebt !== undefined && { dueDate: isDebt && dueDate ? new Date(dueDate) : null }),
      ...(scope === "PRODUCTS" && productIds?.length && {
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

  return NextResponse.json({ ok: true, expense: updated })
}
