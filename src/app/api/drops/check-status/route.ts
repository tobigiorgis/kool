import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"

export async function POST() {
  try {
    const now = new Date()

    const updated = await prisma.drop.updateMany({
      where: {
        status: "PRE_LAUNCH",
        launchDate: { lte: now },
      },
      data: { status: "ACTIVE" },
    })

    return NextResponse.json({ updated: updated.count })
  } catch (error) {
    return handleError("[Drops] POST /api/drops/check-status", error)
  }
}
