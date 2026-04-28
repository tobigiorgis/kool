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
  { params }: { params: Promise<{ id: string; debtId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id, debtId } = await params

  const debt = await prisma.dropDebt.findFirst({
    where: { id: debtId, drop: { id, workspaceId } },
  })
  if (!debt) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { paid } = await request.json()

  const updated = await prisma.dropDebt.update({
    where: { id: debtId },
    data: { paidAt: paid ? new Date() : null },
  })

  return NextResponse.json({ ok: true, debt: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; debtId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id, debtId } = await params

  await prisma.dropDebt.deleteMany({
    where: { id: debtId, drop: { id, workspaceId } },
  })

  return NextResponse.json({ ok: true })
}
