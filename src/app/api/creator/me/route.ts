import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"
import { z } from "zod"

// GET — datos del creator autenticado (primer record por userId)
export async function GET() {
  try {
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
  } catch (error) {
    return handleError("[Creator/me] GET", error)
  }
}

const UpdateCreatorSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
  niche: z.string().optional(),
  audienceSize: z.union([z.string(), z.number()]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  bankAlias: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingProvince: z.string().optional(),
  shippingZipCode: z.string().optional(),
})

// PATCH — actualiza datos del creator
// Actualiza TODOS los records del creator con el mismo userId o email
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = UpdateCreatorSchema.parse(await request.json())

    const allowed = [
      "name",
      "phone",
      "avatar",
      "instagram",
      "tiktok",
      "youtube",
      "twitter",
      "niche",
      "audienceSize",
      "address",
      "city",
      "province",
      "country",
      "zipCode",
      "bankAlias",
      "shippingAddress",
      "shippingCity",
      "shippingProvince",
      "shippingZipCode",
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
  } catch (error) {
    return handleError("[Creator/me] PATCH", error)
  }
}
