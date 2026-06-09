import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

// GET — datos del creator autenticado (primer record por userId)
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const creator = await prisma.creator.findFirst({
    where: { userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      instagram: true,
      tiktok: true,
      youtube: true,
      twitter: true,
      niche: true,
      audienceSize: true,
      address: true,
      city: true,
      province: true,
      country: true,
      zipCode: true,
      bankAlias: true,
      shippingAddress: true,
      shippingCity: true,
      shippingProvince: true,
      shippingZipCode: true,
    },
  })

  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(creator)
}

// PATCH — actualiza datos del creator
// Actualiza TODOS los records del creator con el mismo userId o email
export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  const allowed = [
    "name", "phone", "avatar",
    "instagram", "tiktok", "youtube", "twitter",
    "niche", "audienceSize",
    "address", "city", "province", "country", "zipCode",
    "bankAlias", "shippingAddress", "shippingCity", "shippingProvince", "shippingZipCode",
  ] as const

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key] === "" ? null : body[key]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  // Find all creator records for this user and update them all (same person, multiple workspaces)
  const creators = await prisma.creator.findMany({ where: { userId } })
  if (creators.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.creator.updateMany({
    where: { userId },
    data,
  })

  return NextResponse.json({ ok: true })
}
