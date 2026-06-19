import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import {
  sendApplicationAccepted,
  sendApplicationAcceptedExisting,
  sendApplicationRejected,
} from "@/lib/email"
import { ok, fail, unauthorized, notFound, badRequest } from "@/lib/api/response"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"
import { z } from "zod"

const UpdateSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
  notes: z.string().optional(),
})

const BASE_URL = env.NEXT_PUBLIC_APP_URL || "https://kool-beta.vercel.app"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { id, applicationId } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { workspace: { select: { id: true, name: true } } },
  })
  if (!campaign) return notFound()

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return fail("No access", 403)

  const application = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!application || application.campaignId !== id) {
    return notFound()
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

      // Add creator to the campaign (upsert to avoid duplicate errors)
      await prisma.campaignCreator.upsert({
        where: { campaignId_creatorId: { campaignId: id, creatorId: creator.id } },
        create: { campaignId: id, creatorId: creator.id, status: "ACCEPTED" },
        update: { status: "ACCEPTED" },
      })

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
        }).catch((e) => logger.error("[Campaigns applications] accepted email", e))
      } else {
        const registerUrl = `${BASE_URL}/register?email=${encodeURIComponent(application.email)}&campaignId=${campaign.id}`
        sendApplicationAccepted({
          to: application.email,
          applicantName: application.name,
          campaignName: campaign.name,
          brandName: campaign.workspace.name,
          registerUrl,
        }).catch((e) => logger.error("[Campaigns applications] accepted email", e))
      }

      return ok({ application: updated, creator })
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
    }).catch((e) => logger.error("[Campaigns applications] rejected email", e))

    return ok({ application: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Datos inválidos")
    }
    logger.error("[Campaigns applications] PATCH", error)
    return fail("Error al actualizar", 500)
  }
}
