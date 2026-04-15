/**
 * Kool — Webhook handler: Tiendanube order/paid
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
      // Orden sin código de creator — no hay comisión que registrar
      return NextResponse.json({ ok: true, attributed: false })
    }

    // Buscar el creator por su código de descuento
    const creator = await prisma.creator.findFirst({
      where: {
        workspaceId: connection.workspaceId,
        discountCode: parsed.creatorCode,
        status: "ACTIVE",
      },
    })

    if (!creator) {
      // Código no corresponde a ningún creator activo
      return NextResponse.json({ ok: true, attributed: false })
    }

    // Buscar el link asociado al creator (para el registro)
    const link = await prisma.link.findFirst({
      where: {
        workspaceId: connection.workspaceId,
        creatorId: creator.id,
        archived: false,
      },
    })

    // Registrar la conversión y la comisión en una transacción
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
      const commissionAmount =
        parsed.orderAmount * (creator.commissionPct / 100)

      await tx.commission.create({
        data: {
          creatorId: creator.id,
          conversionId: conversion.id,
          orderAmount: parsed.orderAmount,
          percentage: creator.commissionPct,
          amount: commissionAmount,
          currency: parsed.currency,
          status: "PENDING",
        },
      })
    })

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
