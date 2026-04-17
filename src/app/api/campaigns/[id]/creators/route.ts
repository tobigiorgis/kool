import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { createTiendanubeCoupon, deleteTiendanubeCoupon } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"
import { z } from "zod"

const AddCreatorsSchema = z.object({
  creatorIds: z.array(z.string()).min(1),
  commissionPct: z.number().min(1).max(50).optional(),
  discountCode: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params

  try {
    const body = await request.json()
    const data = AddCreatorsSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: campaign.workspaceId },
    })
    if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

    // Obtener la conexión con Tiendanube (opcional — si no hay, igual guardamos en DB)
    const connection = await prisma.tiendanubeConnection.findUnique({
      where: { workspaceId: campaign.workspaceId },
    })

    // Upsert each creator into the campaign
    const results = await Promise.all(
      data.creatorIds.map(async (creatorId) => {
        const cc = await prisma.campaignCreator.upsert({
          where: { campaignId_creatorId: { campaignId, creatorId } },
          create: {
            campaignId,
            creatorId,
            commissionPct: data.commissionPct,
            discountCode: data.discountCode,
          },
          update: {
            ...(data.commissionPct !== undefined && { commissionPct: data.commissionPct }),
            ...(data.discountCode !== undefined && { discountCode: data.discountCode }),
          },
        })

        // Si hay código y hay tienda conectada, crear el cupón en Tiendanube
        if (data.discountCode && connection?.active) {
          try {
            const accessToken = decrypt(connection.accessToken)
            await createTiendanubeCoupon(connection.storeId, accessToken, {
              code: data.discountCode,
              type: "percentage",
              value: data.commissionPct ?? 10,
              valid: true,
            })
          } catch (e: any) {
            // Si el cupón ya existe (error 422 con "already taken"), ignorar
            if (!e?.message?.includes("422")) {
              console.error(`[Campaign] Error creando cupón ${data.discountCode} en TN:`, e)
            }
          }
        }

        return cc
      })
    )

    return NextResponse.json({ ok: true, added: results.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    console.error("[Campaign] Add creators error:", error)
    return NextResponse.json({ error: "Error al agregar creators" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params
  const creatorId = request.nextUrl.searchParams.get("creatorId")
  if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 })

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: campaign.workspaceId },
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  // Obtener el código antes de borrar para poder eliminar el cupón en TN
  const campaignCreator = await prisma.campaignCreator.findUnique({
    where: { campaignId_creatorId: { campaignId, creatorId } },
  })

  await prisma.campaignCreator.deleteMany({
    where: { campaignId, creatorId },
  })

  // Si tenía código, verificar si algún otro creator en alguna campaña lo usa
  // antes de borrarlo en Tiendanube
  if (campaignCreator?.discountCode) {
    const otherUsage = await prisma.campaignCreator.findFirst({
      where: { discountCode: campaignCreator.discountCode },
    })

    if (!otherUsage) {
      const connection = await prisma.tiendanubeConnection.findUnique({
        where: { workspaceId: campaign.workspaceId },
      })

      if (connection?.active) {
        try {
          // Buscar el ID del cupón en Tiendanube para borrarlo
          // (Tiendanube requiere el ID numérico, no el código)
          // Por ahora solo logueamos — implementar si se necesita
          console.log(`[Campaign] Cupón ${campaignCreator.discountCode} sin uso, considerar borrar en TN`)
        } catch (e) {
          console.error("[Campaign] Error borrando cupón en TN:", e)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
