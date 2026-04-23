import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const FieldConfig = z.object({
  enabled: z.boolean(),
  required: z.boolean(),
})

const CreateCampaignSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["PRE_LAUNCH", "RUNNING", "COMPLETED"]).default("PRE_LAUNCH"),
  budget: z.number().optional(),
  // Landing page fields
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  fields: z.object({
    phone:     FieldConfig.optional(),
    age:       FieldConfig.optional(),
    city:      FieldConfig.optional(),
    instagram: FieldConfig.optional(),
    tiktok:    FieldConfig.optional(),
  }).optional(),
  brandLogo:   z.string().optional(),
  coverImage:  z.string().optional(),
  brandColor:  z.string().optional(),
  formStatus:  z.enum(["ACTIVE", "PAUSED", "CLOSED"]).default("ACTIVE"),
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

    // Validate slug uniqueness if provided
    if (data.slug) {
      const existing = await prisma.campaign.findUnique({ where: { slug: data.slug } })
      if (existing) {
        return NextResponse.json({ error: "Este slug ya está en uso. Elegí uno diferente." }, { status: 409 })
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status,
        budget: data.budget,
        slug: data.slug,
        fields: data.fields,
        brandLogo: data.brandLogo,
        coverImage: data.coverImage,
        brandColor: data.brandColor ?? "#00C46A",
        formStatus: data.formStatus,
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
      _count: { select: { creators: true, links: true, applications: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Add pending application count
  const campaignIds = campaigns.filter((c) => c.slug).map((c) => c.id)
  const pendingCounts = campaignIds.length
    ? await prisma.application.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, status: "PENDING" },
        _count: true,
      })
    : []

  const pendingMap: Record<string, number> = {}
  for (const p of pendingCounts) pendingMap[p.campaignId] = p._count

  const result = campaigns.map((c) => ({
    ...c,
    pendingApplications: pendingMap[c.id] ?? 0,
  }))

  return NextResponse.json({ campaigns: result })
}
