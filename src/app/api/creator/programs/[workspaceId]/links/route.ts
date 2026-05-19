import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { workspaceId } = await params

  const creator = await prisma.creator.findFirst({
    where: { workspaceId, userId },
  })
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const links = await prisma.link.findMany({
    where: { creatorId: creator.id, workspaceId, archived: false },
    include: {
      _count: { select: { clicks: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    links: links.map((l) => ({
      id: l.id,
      slug: l.slug,
      destination: l.destination,
      title: l.title,
      discountCode: l.discountCode,
      clickCount: l._count.clicks,
    })),
  })
}
