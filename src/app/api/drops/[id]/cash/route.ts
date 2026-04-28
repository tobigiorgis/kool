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

  const { amount, notes } = await request.json()

  const cash = await prisma.dropCash.upsert({
    where: { dropId: id },
    create: { dropId: id, amount: Number(amount), notes: notes || null },
    update: { amount: Number(amount), notes: notes || null },
  })

  return NextResponse.json({ ok: true, cash })
}
