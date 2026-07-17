import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { sendBriefing } from "@/lib/email"
import { handleError } from "@/lib/api/response"
import { logger } from "@/lib/logger"
import { z } from "zod"

const UpdateBriefingSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  campaignName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  assets: z.array(z.object({ name: z.string(), url: z.string(), type: z.string() })).optional(),
  notify: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const briefing = await prisma.briefing.findUnique({
      where: { id },
      include: {
        workspace: { include: { members: { where: { userId } } } },
        recipients: { include: { creator: { select: { id: true, name: true, email: true } } } },
      },
    })

    if (!briefing || briefing.workspace.members.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await request.json()
    const data = UpdateBriefingSchema.parse(body)

    const updated = await prisma.briefing.update({
      where: { id },
      data: {
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.campaignName !== undefined && { campaignName: data.campaignName || null }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.assets !== undefined && { assets: data.assets }),
      },
    })

    if (data.notify && briefing.recipients.length > 0) {
      const campaignName = data.campaignName ?? briefing.campaignName ?? briefing.subject
      const bodyText = data.body ?? briefing.body
      for (const recipient of briefing.recipients) {
        await sendBriefing({
          to: recipient.creator.email,
          creatorName: recipient.creator.name,
          brandName: briefing.workspace.name,
          campaignName,
          briefingHtml: `<p><strong>El briefing fue actualizado.</strong></p><p>${bodyText.replace(/\n/g, "<br>")}</p>`,
        }).catch((err) => logger.error("[Briefing] Update email error", err))
      }
    }

    return NextResponse.json({ ok: true, briefing: updated })
  } catch (error) {
    return handleError("[Briefing] PATCH", error)
  }
}
