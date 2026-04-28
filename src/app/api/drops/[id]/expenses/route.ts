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
  // productIds: string[] — solo si scope === "PRODUCTS"
  const { amount, currency, date, category, notes, scope, productIds, isDebt, creditor, dueDate } = body

  const expense = await prisma.expense.create({
    data: {
      dropId: id,
      amount: Number(amount),
      currency: currency || "ARS",
      date: new Date(date),
      category,
      notes: notes || null,
      scope: scope || "DROP",
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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id } = await params
  const { expenseId } = await request.json()

  // Verify the expense belongs to this drop which belongs to this workspace
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, dropId: id, drop: { workspaceId } },
  })
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.expense.delete({ where: { id: expenseId } })

  return NextResponse.json({ ok: true })
}
