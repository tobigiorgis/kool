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
import { parseTiendanubeOrderWebhook, verifyTiendanubeWebhookSignature } from "@/lib/tiendanube"
import { getSaleRealStatus } from "@/lib/drops/sales"
import { sendSaleGenerated, sendBountyAchieved } from "@/lib/email"
import { evaluateBounties } from "@/lib/bounties"
import { logger } from "@/lib/logger"
import { env } from "@/lib/env"

export async function POST(request: NextRequest) {
  try {
    // Verificar firma HMAC antes de procesar. Tiendanube firma el body crudo
    // con el client_secret. Sin esto, cualquiera podría POSTear ventas falsas
    // y generar comisiones fraudulentas.
    const rawBody = await request.text()
    const signature = request.headers.get("x-linkedstore-hmac-sha256")
    if (!verifyTiendanubeWebhookSignature(rawBody, signature)) {
      logger.warn("[Webhook order/paid]", "Firma inválida — rechazado")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    const body = JSON.parse(rawBody)

    logger.info("[Webhook order/paid]", "Received", {
      orderId: body.id,
      storeId: body.store_id,
      total: body.total,
      coupon: body.promotional_discount?.code,
      utm: body.utm_parameters,
    })

    // Tiendanube envía el store_id en el header o en el body
    const storeId = request.headers.get("x-store-id") || body.store_id?.toString()

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
      const orderProducts: {
        product_id?: number
        variant_id?: number
        quantity: number
        price: string
      }[] = body.products || []

      for (const op of orderProducts) {
        const productIdStr = op.product_id?.toString()
        const variantIdStr = op.variant_id?.toString()
        if (!productIdStr && !variantIdStr) continue

        const dropProduct = await prisma.dropProduct.findFirst({
          where: {
            drop: { workspaceId: connection.workspaceId },
            OR: [
              productIdStr ? { tiendanubeProductId: productIdStr } : {},
              variantIdStr ? { tiendanubeVariantId: variantIdStr } : {},
            ],
          },
          include: {
            drop: { select: { launchDate: true, sale: true } },
            saleDiscount: true,
          },
        })

        if (!dropProduct) continue

        // Solo contar ventas desde la fecha de lanzamiento
        if (parsed.orderDate < dropProduct.drop.launchDate) continue

        const qty = op.quantity || 1
        const unitPrice = parseFloat(op.price || "0")

        // Detectar si hay sale activo
        const dropSale = dropProduct.drop.sale
        const duringSale = !!dropSale && getSaleRealStatus(dropSale) === "ACTIVE"
        const saleDiscountPct = duringSale
          ? (dropProduct.saleDiscount?.discountPct ?? dropSale?.generalDiscountPct ?? null)
          : null

        await prisma.dropProductSale.create({
          data: {
            dropProductId: dropProduct.id,
            conversionId: null,
            quantity: qty,
            unitPrice,
            totalAmount: unitPrice * qty,
            orderId: parsed.orderId,
            duringSale,
            saleDiscountPct,
          },
        })
      }

      logger.info("[Webhook order/paid]", "No creator code — drop sales recorded if applicable")
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
    const creator =
      campaignCreator?.creator ??
      (await prisma.creator.findFirst({
        where: {
          workspaceId: connection.workspaceId,
          discountCode: parsed.creatorCode,
          status: "ACTIVE",
        },
      }))

    if (!creator) {
      logger.info("[Webhook order/paid]", "Skipped: creator not found", {
        creatorCode: parsed.creatorCode,
      })
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
          campaignId: campaignCreator?.campaignId || undefined,
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
      const orderProducts: {
        product_id?: number
        variant_id?: number
        quantity: number
        price: string
      }[] = body.products || []

      for (const op of orderProducts) {
        const productIdStr = op.product_id?.toString()
        const variantIdStr = op.variant_id?.toString()

        if (!productIdStr && !variantIdStr) continue

        const dropProduct = await tx.dropProduct.findFirst({
          where: {
            drop: { workspaceId: connection.workspaceId },
            OR: [
              productIdStr ? { tiendanubeProductId: productIdStr } : {},
              variantIdStr ? { tiendanubeVariantId: variantIdStr } : {},
            ],
          },
          include: {
            drop: { select: { launchDate: true, sale: true } },
            saleDiscount: true,
          },
        })

        if (!dropProduct) continue

        // Solo contar ventas desde la fecha de lanzamiento
        if (parsed.orderDate < dropProduct.drop.launchDate) continue

        const qty = op.quantity || 1
        const unitPrice = parseFloat(op.price || "0")

        // Detectar si hay sale activo
        const dropSaleTx = dropProduct.drop.sale
        const duringSaleTx = !!dropSaleTx && getSaleRealStatus(dropSaleTx) === "ACTIVE"
        const saleDiscountPctTx = duringSaleTx
          ? (dropProduct.saleDiscount?.discountPct ?? dropSaleTx?.generalDiscountPct ?? null)
          : null

        await tx.dropProductSale.create({
          data: {
            dropProductId: dropProduct.id,
            conversionId: conversion.id,
            quantity: qty,
            unitPrice,
            totalAmount: unitPrice * qty,
            orderId: parsed.orderId,
            duringSale: duringSaleTx,
            saleDiscountPct: saleDiscountPctTx,
          },
        })
      }
    })

    const commissionAmount = parsed.orderAmount * (commissionPct / 100)
    logger.info("[Webhook order/paid]", "Attribution success", {
      creator: creator.name,
      commission: commissionAmount,
    })

    // Evaluar bounties de la campaña: crear achievements de tiers recién alcanzados
    if (campaignCreator?.campaignId) {
      try {
        const newlyAchieved = await evaluateBounties(creator.id, campaignCreator.campaignId)
        for (const a of newlyAchieved) {
          logger.info("[Webhook order/paid] Bounty achievement", "bounty_achieved", {
            creator: creator.name,
            bountyName: a.bountyName,
            reward: a.reward,
          })
          if (creator.email) {
            void sendBountyAchieved({
              to: creator.email,
              creatorName: creator.firstName || creator.name || "creator",
              brandName: connection.workspace?.name || "tu marca",
              bountyName: a.bountyName,
              reward: a.reward,
              dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/creator/program/${campaignCreator.campaignId}`,
            })
          }
        }
      } catch (err) {
        logger.error("[Webhook order/paid] Bounty evaluation error", err)
      }
    }

    // Email "venta generada" al creator (fire-and-forget — no bloquea el 200 a Tiendanube)
    if (creator.email) {
      void sendSaleGenerated({
        to: creator.email,
        creatorName: creator.firstName || creator.name || "creator",
        brandName: connection.workspace?.name || "tu marca",
        orderAmount: parsed.orderAmount,
        commissionAmount,
        currency: parsed.currency,
        dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/creator`,
      })
    }

    return NextResponse.json({
      ok: true,
      attributed: true,
      creatorId: creator.id,
    })
  } catch (error) {
    logger.error("[Webhook order/paid] Tiendanube order/paid error", error)
    // Devolvemos 200 igual para que Tiendanube no reintente indefinidamente
    // El error queda logueado para revisar
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 200 })
  }
}
