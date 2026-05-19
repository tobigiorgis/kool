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
    include: {
      workspace: true,
      links: { where: { archived: false } },
    },
  })
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const commissions = await prisma.commission.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      conversion: { include: { link: { select: { slug: true } } } },
    },
  })

  const totalEarnings = await prisma.commission.aggregate({
    where: { creatorId: creator.id },
    _sum: { amount: true },
  })

  return NextResponse.json({
    workspace: {
      id: creator.workspace.id,
      name: creator.workspace.name,
      logo: creator.workspace.brandLogo ?? creator.workspace.logo,
      supportEmail: creator.workspace.supportEmail,
      supportUrl: creator.workspace.supportUrl,
      termsUrl: creator.workspace.termsUrl,
    },
    creator: {
      id: creator.id,
      name: creator.name,
      commissionPct: creator.commissionPct,
      discountCode: creator.discountCode,
      tier: creator.tier,
    },
    links: creator.links.map((l) => ({
      id: l.id,
      slug: l.slug,
      destination: l.destination,
    })),
    totalEarnings: totalEarnings._sum.amount ?? 0,
    recentCommissions: commissions,
  })
}
