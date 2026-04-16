import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CreateCampaignSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["PRE_LAUNCH", "RUNNING", "COMPLETED"]).default("PRE_LAUNCH"),
  budget: z.number().optional(),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const data = CreateCampaignSchema.parse(body)

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: data.workspaceId },
    })
    if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status,
        budget: data.budget,
      },
    })

    return NextResponse.json({ ok: true, campaign })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Campaign] Create error:", error)
    return NextResponse.json({ error: "Error al crear campaña" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { creators: true, links: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ campaigns })
}
