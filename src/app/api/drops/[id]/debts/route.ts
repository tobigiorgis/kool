import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { ok, notFound, handleError } from "@/lib/api/response"

const CreateDebtSchema = z.object({
  description: z.string(),
  amount: z.coerce.number(),
  creditor: z.string().nullish(),
  dueDate: z.string().nullish(),
  notes: z.string().nullish(),
  priority: z.coerce.number().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params

    const drop = await prisma.drop.findFirst({ where: { id, workspaceId } })
    if (!drop) return notFound()

    const body = await request.json()
    const data = CreateDebtSchema.parse(body)

    const debt = await prisma.dropDebt.create({
      data: {
        dropId: id,
        description: data.description,
        amount: Number(data.amount),
        creditor: data.creditor || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        priority: data.priority !== undefined ? Number(data.priority) : 2,
      },
    })

    return ok({ debt }, { status: 201 })
  } catch (error) {
    return handleError("[Drops] POST /api/drops/[id]/debts", error)
  }
}
