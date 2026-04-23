import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import {
  sendApplicationAccepted,
  sendApplicationAcceptedExisting,
  sendApplicationRejected,
} from "@/lib/email"
import { z } from "zod"

const UpdateSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
  notes: z.string().optional(),
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kool-beta.vercel.app"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, applicationId } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { workspace: { select: { id: true, name: true } } },
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  const application = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!application || application.campaignId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const data = UpdateSchema.parse(body)

    if (data.status === "ACCEPTED") {
      // Check if a creator with this email already exists in the workspace
      let creator = await prisma.creator.findFirst({
        where: { workspaceId: campaign.workspaceId, email: application.email },
      })

      if (!creator) {
        creator = await prisma.creator.create({
          data: {
            workspaceId: campaign.workspaceId,
            name: application.name,
            email: application.email,
            phone: application.phone,
            city: application.city,
            instagram: application.instagram,
            tiktok: application.tiktok,
          },
        })
      }

      // Update application
      const updated = await prisma.application.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED", creatorId: creator.id, notes: data.notes },
      })

      // Check if creator has a Kool account (userId set)
      if (creator.userId) {
        sendApplicationAcceptedExisting({
          to: application.email,
          applicantName: application.name,
          campaignName: campaign.name,
          brandName: campaign.workspace.name,
          dashboardUrl: `${BASE_URL}/creator`,
        }).catch(console.error)
      } else {
        const registerUrl = `${BASE_URL}/register?email=${encodeURIComponent(application.email)}&campaignId=${campaign.id}`
        sendApplicationAccepted({
          to: application.email,
          applicantName: application.name,
          campaignName: campaign.name,
          brandName: campaign.workspace.name,
          registerUrl,
        }).catch(console.error)
      }

      return NextResponse.json({ ok: true, application: updated, creator })
    }

    // REJECTED
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: "REJECTED", notes: data.notes },
    })

    sendApplicationRejected({
      to: application.email,
      applicantName: application.name,
      campaignName: campaign.name,
      brandName: campaign.workspace.name,
    }).catch(console.error)

    return NextResponse.json({ ok: true, application: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    console.error("[Applications] Update error:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}
