/**
 * Kool — API de Gifting
 * POST /api/gifting — Crear un envío de gifting
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createTiendanubeGiftingOrder } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { z } from "zod"

const CreateGiftingSchema = z.object({
  workspaceId: z.string(),
  creatorId: z.string(),
  campaignId: z.string().optional(),
  products: z.array(z.object({
    variantId: z.number(),
    productId: z.number(),
    name: z.string(),
    quantity: z.number().min(1),
    value: z.number(),
  })),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = CreateGiftingSchema.parse(body)

    // Verificar que el user pertenece al workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: data.workspaceId, user: { id: userId } },
    })
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Obtener el creator con su dirección
    const creator = await prisma.creator.findUnique({
      where: { id: data.creatorId },
    })
    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    // Obtener la conexión con Tiendanube
    const connection = await prisma.tiendanubeConnection.findUnique({
      where: { workspaceId: data.workspaceId },
    })
    if (!connection || !connection.active) {
      return NextResponse.json(
        { error: "No hay tienda Tiendanube conectada" },
        { status: 422 }
      )
    }

    // Calcular valor total del gifting
    const totalValue = data.products.reduce(
      (sum, p) => sum + p.value * p.quantity, 0
    )

    const hasAddress = !!(creator.address && creator.city)
    const nameParts = creator.name.trim().split(" ")
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(" ") || nameParts[0]

    let tiendanubeOrderId: string | undefined

    if (hasAddress) {
      // Crear la orden en Tiendanube solo si hay dirección
      const accessToken = decrypt(connection.accessToken)
      const addressPayload = {
        first_name: firstName,
        last_name: lastName,
        address: creator.address!,
        city: creator.city!,
        province: creator.province || "",
        zipcode: creator.zipCode || "",
        country: creator.country || "AR",
        phone: creator.phone || "",
      }
      const tnOrder = await createTiendanubeGiftingOrder(
        connection.storeId,
        accessToken,
        {
          contact_email: creator.email,
          contact_name: creator.name,
          products: data.products.map((p) => ({
            variant_id: p.variantId,
            quantity: p.quantity,
            price: 0,
          })),
          shipping_address: addressPayload,
          billing_address: addressPayload,
          note: data.notes,
          send_email: false,
        }
      )
      tiendanubeOrderId = (tnOrder as any).id?.toString()
    }

    // Guardar el gifting en Kool
    const giftingOrder = await prisma.giftingOrder.create({
      data: {
        workspaceId: data.workspaceId,
        creatorId: data.creatorId,
        campaignId: data.campaignId,
        tiendanubeOrderId: tiendanubeOrderId ?? null,
        tiendanubeStoreId: connection.storeId,
        products: data.products,
        totalValue,
        status: hasAddress ? "PROCESSING" : "PENDING",
        notes: data.notes,
      },
    })

    return NextResponse.json({
      ok: true,
      giftingOrder,
      tiendanubeOrderId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("[Gifting] Error:", error)
    return NextResponse.json(
      { error: "Error al crear el gifting" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  const campaignId = request.nextUrl.searchParams.get("campaignId")

  if (!workspaceId && !campaignId) {
    return NextResponse.json({ error: "Missing workspaceId or campaignId" }, { status: 400 })
  }

  const giftingOrders = await prisma.giftingOrder.findMany({
    where: {
      ...(workspaceId ? { workspaceId } : {}),
      ...(campaignId ? { campaignId } : {}),
    },
    include: { creator: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ giftingOrders })
}
