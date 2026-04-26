/**
 * Kool — Webhook handler: Tiendanube order/paid
 * Route: POST /api/webhooks/tiendanube/order-paid
 *
 * Este es el endpoint más crítico del sistema.
 * Cuando alguien compra en una tienda conectada a Kool,
 * Tiendanube nos notifica aquí y nosotros:
 * 1. Identificamos qué creator generó la venta
 * 2. Registramos la conversión
 * 3. Calculamos y creamos la comisión
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseTiendanubeOrderWebhook } from "@/lib/tiendanube"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[Webhook order/paid] Received:", JSON.stringify({
      orderId: body.id,
      storeId: body.store_id,
      total: body.total,
      coupon: body.promotional_discount?.code,
      utm: body.utm_parameters,
    }))

    // Tiendanube envía el store_id en el header o en el body
    const storeId =
      request.headers.get("x-store-id") ||
      body.store_id?.toString()

    if (!storeId) {
      return NextResponse.json({ error: "Missing store_id" }, { status: 400 })
    }

    // Idempotencia: Tiendanube puede enviar el mismo webhook múltiples veces
    const orderId = body.id?.toString()
    if (!orderId) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 })
    }

    const existingConversion = await prisma.conversion.findFirst({
      where: { orderId, platform: "TIENDANUBE" },
    })

    if (existingConversion) {
      // Ya procesamos esta orden, responder OK igual
      return NextResponse.json({ ok: true, duplicate: true })
    }

    // Encontrar el workspace que tiene esta tienda conectada
    const connection = await prisma.tiendanubeConnection.findFirst({
      where: { storeId, active: true },
      include: { workspace: true },
    })

    if (!connection) {
      // Tienda no conectada a ningún workspace de Kool
      return NextResponse.json({ error: "Store not connected" }, { status: 404 })
    }

    // Parsear los datos de la orden
    const parsed = parseTiendanubeOrderWebhook(body)

    if (!parsed.creatorCode) {
      // Sin creator code: igual registrar ventas en DropProductSale (sin conversión)
      const orderProducts: { product_id?: number; variant_id?: number; quantity: number; price: string }[] =
        body.products || []

      for (const op of orderProducts) {
        const productIdStr = op.product_id?.toString()
        const variantIdStr = op.variant_id?.toString()
        if (!productIdStr && !variantIdStr) continue

        const dropProduct = await prisma.dropProduct.findFirst({
          where: {
            drop: { workspaceId: connection.workspaceId, status: "ACTIVE" },
            OR: [
              productIdStr ? { tiendanubeProductId: productIdStr } : {},
              variantIdStr ? { tiendanubeVariantId: variantIdStr } : {},
            ],
          },
        })

        if (!dropProduct) continue

        const qty = op.quantity || 1
        const unitPrice = parseFloat(op.price || "0")

        await prisma.dropProductSale.create({
          data: {
            dropProductId: dropProduct.id,
            conversionId: null,
            quantity: qty,
            unitPrice,
            totalAmount: unitPrice * qty,
            orderId: parsed.orderId,
          },
        })
      }

      console.log("[Webhook] No creator code — drop sales recorded if applicable")
      return NextResponse.json({ ok: true, attributed: false })
    }

    // Buscar el creator por su código de descuento en CampaignCreator (por campaña)
    const campaignCreator = await prisma.campaignCreator.findFirst({
      where: {
        discountCode: parsed.creatorCode,
        campaign: { workspaceId: connection.workspaceId },
      },
      include: {
        creator: true,
        campaign: true,
      },
    })

    // Fallback: buscar por discountCode directo en el creator (legacy)
    const creator = campaignCreator?.creator ?? await prisma.creator.findFirst({
      where: {
        workspaceId: connection.workspaceId,
        discountCode: parsed.creatorCode,
        status: "ACTIVE",
      },
    })

    if (!creator) {
      console.log("[Webhook] Skipped: creator not found for code:", parsed.creatorCode)
      return NextResponse.json({ ok: true, attributed: false })
    }

    // Usar comisión de campaña si existe, si no la del creator
    const commissionPct = campaignCreator?.commissionPct ?? creator.commissionPct

    // Buscar el link asociado al creator (para el registro)
    const link = await prisma.link.findFirst({
      where: {
        workspaceId: connection.workspaceId,
        creatorId: creator.id,
        archived: false,
      },
    })

    // Registrar la conversión, la comisión y las ventas de Drop en una transacción
    await prisma.$transaction(async (tx) => {
      const conversion = await tx.conversion.create({
        data: {
          linkId: link?.id || undefined,
          creatorId: creator.id,
          orderId: parsed.orderId,
          platform: "TIENDANUBE",
          orderAmount: parsed.orderAmount,
          currency: parsed.currency,
          convertedAt: new Date(),
        },
      })

      // Calcular comisión
      const commissionAmount = parsed.orderAmount * (commissionPct / 100)

      await tx.commission.create({
        data: {
          creatorId: creator.id,
          conversionId: conversion.id,
          orderAmount: parsed.orderAmount,
          percentage: commissionPct,
          amount: commissionAmount,
          currency: parsed.currency,
          status: "PENDING",
        },
      })

      // Registrar ventas en DropProductSale si hay productos del Drop
      const orderProducts: { product_id?: number; variant_id?: number; quantity: number; price: string }[] =
        body.products || []

      for (const op of orderProducts) {
        const productIdStr = op.product_id?.toString()
        const variantIdStr = op.variant_id?.toString()

        if (!productIdStr && !variantIdStr) continue

        const dropProduct = await tx.dropProduct.findFirst({
          where: {
            drop: { workspaceId: connection.workspaceId, status: "ACTIVE" },
            OR: [
              productIdStr ? { tiendanubeProductId: productIdStr } : {},
              variantIdStr ? { tiendanubeVariantId: variantIdStr } : {},
            ],
          },
        })

        if (!dropProduct) continue

        const qty = op.quantity || 1
        const unitPrice = parseFloat(op.price || "0")

        await tx.dropProductSale.create({
          data: {
            dropProductId: dropProduct.id,
            conversionId: conversion.id,
            quantity: qty,
            unitPrice,
            totalAmount: unitPrice * qty,
            orderId: parsed.orderId,
          },
        })
      }
    })

    console.log("[Webhook] Attribution success:", creator.name, "commission:", parsed.orderAmount * (commissionPct / 100))

    return NextResponse.json({
      ok: true,
      attributed: true,
      creatorId: creator.id,
    })
  } catch (error) {
    console.error("[Webhook] Tiendanube order/paid error:", error)
    // Devolvemos 200 igual para que Tiendanube no reintente indefinidamente
    // El error queda logueado para revisar
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 200 })
  }
}
