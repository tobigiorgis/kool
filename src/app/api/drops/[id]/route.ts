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

  const drop = await prisma.drop.findFirst({
    where: { id, workspaceId },
    include: {
      products: {
        include: {
          sales: true,
          expenseAssignments: { include: { expense: true } },
        },
      },
      expenses: {
        include: { assignments: { include: { dropProduct: { select: { id: true, name: true } } } } },
        orderBy: { date: "desc" },
      },
    },
  })

  if (!drop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ drop })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id } = await params
  const body = await request.json()

  const drop = await prisma.drop.updateMany({
    where: { id, workspaceId },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
      ...(body.launchDate && { launchDate: new Date(body.launchDate) }),
      ...(body.closeDate !== undefined && {
        closeDate: body.closeDate ? new Date(body.closeDate) : null,
      }),
      ...(body.status && { status: body.status }),
    },
  })

  if (drop.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = await getWorkspaceId(userId)
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 })

  const { id } = await params

  await prisma.drop.deleteMany({ where: { id, workspaceId } })

  return NextResponse.json({ ok: true })
}
