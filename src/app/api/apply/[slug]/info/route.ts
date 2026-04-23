import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      brandLogo: true,
      coverImage: true,
      brandColor: true,
      formStatus: true,
      fields: true,
      workspace: { select: { name: true } },
    },
  })

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (campaign.formStatus === "CLOSED") {
    return NextResponse.json({ error: "Esta campaña ya no está aceptando aplicaciones." }, { status: 410 })
  }

  return NextResponse.json({ campaign })
}
