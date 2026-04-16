import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const AddCreatorsSchema = z.object({
  creatorIds: z.array(z.string()).min(1),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params

  try {
    const body = await request.json()
    const data = AddCreatorsSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

    // Upsert each creator into the campaign
    const results = await Promise.all(
      data.creatorIds.map((creatorId) =>
        prisma.campaignCreator.upsert({
          where: { campaignId_creatorId: { campaignId, creatorId } },
          create: {
            campaignId,
            creatorId,
            commissionPct: data.commissionPct,
            discountCode: data.discountCode,
          },
          update: {},
        })
      )
    )

    return NextResponse.json({ ok: true, added: results.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    console.error("[Campaign] Add creators error:", error)
    return NextResponse.json({ error: "Error al agregar creators" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params
  const creatorId = request.nextUrl.searchParams.get("creatorId")
  if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 })

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  await prisma.campaignCreator.deleteMany({
    where: { campaignId, creatorId },
  })

  return NextResponse.json({ ok: true })
}
