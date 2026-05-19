import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { workspaceId } = await params
  const type = req.nextUrl.searchParams.get("type") ?? "sale"

  const creator = await prisma.creator.findFirst({
    where: { workspaceId, userId },
    include: { links: { where: { archived: false } } },
  })
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const linkIds = creator.links.map((l) => l.id)

  if (type === "click") {
    const clicks = linkIds.length
      ? await prisma.click.findMany({
          where: { linkId: { in: linkIds } },
          orderBy: { timestamp: "desc" },
          take: 50,
          include: { link: { select: { slug: true } } },
        })
      : []

    return NextResponse.json({
      events: clicks.map((c) => ({
        id: c.id,
        type: "click",
        linkSlug: c.link.slug,
        date: c.timestamp.toISOString(),
      })),
    })
  }

  // sales = conversions for this creator
  const conversions = await prisma.conversion.findMany({
    where: { creatorId: creator.id },
    orderBy: { convertedAt: "desc" },
    take: 50,
    include: { link: { select: { slug: true } } },
  })

  return NextResponse.json({
    events: conversions.map((c) => ({
      id: c.id,
      type: "sale",
      linkSlug: c.link?.slug ?? null,
      date: c.convertedAt.toISOString(),
      orderId: c.orderId,
      amount: c.orderAmount,
    })),
  })
}
