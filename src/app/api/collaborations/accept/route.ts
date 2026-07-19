import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"

// POST { token } — accept a pending collaborator invite
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

    const collaborator = await prisma.campaignCollaborator.findUnique({
      where: { inviteToken: token },
    })

    if (!collaborator) {
      return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 404 })
    }

    // Ensure user record exists
    const clerkUser = await currentUser()
    const userEmail = clerkUser?.emailAddresses[0]?.emailAddress
    if (!userEmail) return NextResponse.json({ error: "No email" }, { status: 400 })

    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: userEmail,
        name: clerkUser?.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
          : null,
      },
      update: {},
    })

    // Validate email matches invite
    if (collaborator.email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Este link de invitación es para otro email." },
        { status: 403 }
      )
    }

    await prisma.campaignCollaborator.update({
      where: { id: collaborator.id },
      data: {
        userId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        inviteToken: null, // invalidate token after use
      },
    })

    return NextResponse.json({ ok: true, campaignId: collaborator.campaignId })
  } catch (error) {
    return handleError("[Collaborations] accept", error)
  }
}
