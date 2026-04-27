import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const now = new Date()

  const updated = await prisma.drop.updateMany({
    where: {
      status: "PRE_LAUNCH",
      launchDate: { lte: now },
    },
    data: { status: "ACTIVE" },
  })

  return NextResponse.json({ updated: updated.count })
}
