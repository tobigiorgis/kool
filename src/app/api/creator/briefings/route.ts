import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const creatorId = request.nextUrl.searchParams.get("creatorId")
  if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 })

  // Verify the requesting user owns this creator profile
  const creator = await prisma.creator.findFirst({
    where: { id: creatorId, userId },
  })
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const recipients = await prisma.briefingRecipient.findMany({
    where: { creatorId },
    orderBy: { briefing: { createdAt: "desc" } },
    include: {
      briefing: {
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          assets: true,
          sentAt: true,
          createdAt: true,
          campaign: { select: { id: true, name: true } },
          workspace: { select: { name: true } },
        },
      },
    },
  })

  const briefings = recipients
    .filter((r) => r.briefing.status === "SENT")
    .map((r) => r.briefing)

  return NextResponse.json({ briefings })
}
