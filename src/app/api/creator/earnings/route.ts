import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const creator = await prisma.creator.findFirst({ where: { userId } })
    if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const period = request.nextUrl.searchParams.get("period") ?? "all"

    let since: Date | undefined
    if (period === "1d") {
      since = new Date(); since.setDate(since.getDate() - 1)
    } else if (period === "7d") {
      since = new Date(); since.setDate(since.getDate() - 7)
    } else if (period === "30d") {
      since = new Date(); since.setDate(since.getDate() - 30)
    }

    const commissions = await prisma.commission.findMany({
      where: {
        creatorId: creator.id,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        conversion: {
          select: {
            orderAmount: true,
            link: {
              select: {
                slug: true,
                campaign: {
                  select: {
                    id: true,
                    name: true,
                    workspace: { select: { name: true, brandLogo: true, brandColor: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    const total = commissions.reduce((s, c) => s + c.amount, 0)
    const pending = commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0)
    const paid = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0)

    return NextResponse.json({ commissions, total, pending, paid })
  } catch (error) {
    return handleError("[Creator/earnings] GET", error)
  }
}
