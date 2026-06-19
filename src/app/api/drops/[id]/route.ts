import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { DropStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { notFound, handleError } from "@/lib/api/response"

const UpdateDropSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullish(),
  coverImage: z.string().nullish(),
  launchDate: z.string().optional(),
  closeDate: z.string().nullish(),
  status: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

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
          include: {
            assignments: { include: { dropProduct: { select: { id: true, name: true } } } },
          },
          orderBy: { date: "desc" },
        },
        sale: true,
      },
    })

    if (!drop) return notFound()

    return NextResponse.json({ drop })
  } catch (error) {
    return handleError("[Drops] GET /api/drops/[id]", error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params
    const body = await request.json()
    const data = UpdateDropSchema.parse(body)

    const drop = await prisma.drop.updateMany({
      where: { id, workspaceId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.launchDate && { launchDate: new Date(data.launchDate) }),
        ...(data.closeDate !== undefined && {
          closeDate: data.closeDate ? new Date(data.closeDate) : null,
        }),
        ...(data.status && { status: data.status as DropStatus }),
      },
    })

    if (drop.count === 0) return notFound()

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError("[Drops] PATCH /api/drops/[id]", error)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params

    await prisma.drop.deleteMany({ where: { id, workspaceId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError("[Drops] DELETE /api/drops/[id]", error)
  }
}
