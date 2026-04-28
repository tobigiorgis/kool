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

  const { paid } = await request.json()

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: { paidAt: paid ? new Date() : null },
  })

  return NextResponse.json({ ok: true, expense: updated })
}
