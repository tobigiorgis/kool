import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireWorkspace } from "@/lib/api/workspace"
import { ok, notFound, handleError } from "@/lib/api/response"

const CashSchema = z.object({
  amount: z.coerce.number(),
  notes: z.string().nullish(),
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
    const { amount, notes } = CashSchema.parse(body)

    const cash = await prisma.dropCash.upsert({
      where: { dropId: id },
      create: { dropId: id, amount: Number(amount), notes: notes || null },
      update: { amount: Number(amount), notes: notes || null },
    })

    return ok({ cash })
  } catch (error) {
    return handleError("[Drops] POST /api/drops/[id]/cash", error)
  }
}
