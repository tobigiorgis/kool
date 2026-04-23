import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendApplicationConfirmation } from "@/lib/email"
import { z } from "zod"

const ApplySchema = z.object({
  name:      z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().optional(),
  age:       z.coerce.number().int().positive().optional(),
  city:      z.string().optional(),
  instagram: z.string().optional(),
  tiktok:    z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    include: { workspace: { select: { name: true } } },
  })

  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
  if (campaign.formStatus === "CLOSED") {
    return NextResponse.json({ error: "Esta campaña ya no está aceptando aplicaciones." }, { status: 410 })
  }
  if (campaign.formStatus === "PAUSED") {
    return NextResponse.json({ error: "Las aplicaciones están temporalmente pausadas." }, { status: 503 })
  }

  try {
    const body = await request.json()
    const data = ApplySchema.parse(body)

    // Validate required fields according to campaign config
    const fields = (campaign.fields ?? {}) as Record<string, { enabled: boolean; required: boolean }>
    const fieldKeys = ["phone", "age", "city", "instagram", "tiktok"] as const
    for (const key of fieldKeys) {
      const cfg = fields[key]
      if (cfg?.required && !data[key]) {
        return NextResponse.json({ error: `El campo ${key} es requerido.` }, { status: 400 })
      }
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: { campaignId_email: { campaignId: campaign.id, email: data.email } },
    })
    if (existing) {
      return NextResponse.json({ error: "Ya enviaste tu aplicación a esta campaña." }, { status: 409 })
    }

    const application = await prisma.application.create({
      data: {
        campaignId: campaign.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        age: data.age,
        city: data.city,
        instagram: data.instagram,
        tiktok: data.tiktok,
      },
    })

    // Send confirmation email (fire and forget)
    sendApplicationConfirmation({
      to: data.email,
      applicantName: data.name,
      campaignName: campaign.name,
      brandName: campaign.workspace.name,
    }).catch((err) => console.error("[Apply] Confirmation email error:", err))

    return NextResponse.json({ ok: true, application: { id: application.id } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Apply] Error:", error)
    return NextResponse.json({ error: "Error al enviar la aplicación" }, { status: 500 })
  }
}
