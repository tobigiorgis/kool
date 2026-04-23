import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendBriefing } from "@/lib/email"
import { z } from "zod"

const CreateBriefingSchema = z.object({
  workspaceId: z.string(),
  campaignId: z.string().optional(),
  subject: z.string().min(1),
  campaignName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  body: z.string().min(1),
  creatorIds: z.array(z.string()),
  assets: z.array(z.object({ name: z.string(), url: z.string(), type: z.string() })).optional(),
  send: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const data = CreateBriefingSchema.parse(body)

    // Verify workspace membership
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: data.workspaceId, userId },
    })
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const workspace = await prisma.workspace.findUnique({ where: { id: data.workspaceId } })

    // Create briefing with recipients
    const briefing = await prisma.briefing.create({
      data: {
        workspaceId: data.workspaceId,
        campaignId: data.campaignId,
        subject: data.subject,
        campaignName: data.campaignName,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        body: data.body,
        assets: data.assets ?? [],
        status: data.send && data.creatorIds.length > 0 ? "SENT" : "DRAFT",
        sentAt: data.send && data.creatorIds.length > 0 ? new Date() : undefined,
        recipients: {
          create: data.creatorIds.map((creatorId) => ({ creatorId })),
        },
      },
      include: { recipients: { include: { creator: true } } },
    })

    // Send emails if requested
    if (data.send && data.creatorIds.length > 0) {
      for (const recipient of briefing.recipients) {
        const { creator } = recipient
        await sendBriefing({
          to: creator.email,
          creatorName: creator.name,
          brandName: workspace?.name ?? "Kool",
          campaignName: data.campaignName ?? data.subject,
          briefingHtml: `<p>${data.body.replace(/\n/g, "<br>")}</p>`,
          startDate: data.startDate,
          endDate: data.endDate,
        }).catch((err) => console.error("[Briefing] Email error:", err))

        // Mark as sent
        await prisma.briefingRecipient.update({
          where: { id: recipient.id },
          data: { emailSent: true, sentAt: new Date() },
        })
      }
    }

    return NextResponse.json({ ok: true, briefing })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Briefing] Create error:", error)
    return NextResponse.json({ error: "Error al crear el briefing" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const briefings = await prisma.briefing.findMany({
    where: { workspaceId },
    include: {
      recipients: {
        include: { creator: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ briefings })
}
