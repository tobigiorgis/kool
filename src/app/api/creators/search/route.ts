import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = request.nextUrl.searchParams.get("q") || ""
  const campaignId = request.nextUrl.searchParams.get("campaignId") || ""

  if (q.length < 2) {
    return NextResponse.json({ creators: [] })
  }

  const creatorsRaw = await prisma.creator.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { instagram: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  })

  let inCampaignSet = new Set<string>()
  if (campaignId && creatorsRaw.length > 0) {
    const existing = await prisma.campaignCreator.findMany({
      where: { campaignId, creatorId: { in: creatorsRaw.map((c) => c.id) } },
      select: { creatorId: true },
    })
    inCampaignSet = new Set(existing.map((cc) => cc.creatorId))
  }

  return NextResponse.json({
    creators: creatorsRaw.map((c) => ({
      id: c.id,
      name: c.name,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      instagram: c.instagram,
      alreadyInCampaign: inCampaignSet.has(c.id),
    })),
  })
}
