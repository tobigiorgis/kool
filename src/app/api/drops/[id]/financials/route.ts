import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDropFinancials } from "@/lib/drops/financials"
import { requireWorkspace } from "@/lib/api/workspace"
import { notFound, handleError } from "@/lib/api/response"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    if (ws.error) return ws.error
    const { workspaceId } = ws

    const { id } = await params

    const drop = await prisma.drop.findFirst({ where: { id, workspaceId } })
    if (!drop) return notFound()

    const data = await getDropFinancials(id)
    return NextResponse.json(data)
  } catch (error) {
    return handleError("[Drops] GET /api/drops/[id]/financials", error)
  }
}
