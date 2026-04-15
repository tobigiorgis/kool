import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { generateDiscountCode } from "@/lib/utils"
import { sendCreatorInvite } from "@/lib/email"
import { z } from "zod"

const ImportSchema = z.object({
  workspaceId: z.string(),
  creators: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    instagram: z.string().optional(),
    commissionPct: z.number().min(1).max(50).default(10),
  })),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { workspaceId, creators } = ImportSchema.parse(body)

    // Verificar membresía
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    })
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })

    // Traer creators existentes en este workspace
    const existingCreators = await prisma.creator.findMany({
      where: { workspaceId },
      select: { email: true },
    })
    const existingEmails = new Set(existingCreators.map((c) => c.email.toLowerCase()))

    // Traer usuarios existentes en nuestra DB
    const emails = creators.map((c) => c.email.toLowerCase())
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, name: true },
    })
    const usersByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]))

    const results = {
      imported: 0,   // ya tenían cuenta → ACTIVE directo
      invited: 0,    // sin cuenta → PENDING + email
      skipped: 0,    // ya estaban en este workspace
      errors: [] as { email: string; reason: string }[],
    }

    for (const row of creators) {
      const email = row.email.toLowerCase()

      // Ya existe en este workspace → skip
      if (existingEmails.has(email)) {
        results.skipped++
        continue
      }

      const discountCode = generateDiscountCode(row.name, row.commissionPct)
      const existingUser = usersByEmail.get(email)

      try {
        if (existingUser) {
          // Usuario existente → creator ACTIVE directo
          await prisma.creator.create({
            data: {
              workspaceId,
              userId: existingUser.id,
              name: row.name || existingUser.name || email.split("@")[0],
              email,
              instagram: row.instagram || undefined,
              commissionPct: row.commissionPct,
              discountCode,
              status: "ACTIVE",
            },
          })
          results.imported++
        } else {
          // Sin cuenta → PENDING + invite
          const creator = await prisma.creator.create({
            data: {
              workspaceId,
              name: row.name,
              email,
              instagram: row.instagram || undefined,
              commissionPct: row.commissionPct,
              discountCode,
              status: "PENDING",
            },
          })

          const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/creator?token=${creator.id}`
          await sendCreatorInvite({
            to: email,
            creatorName: row.name,
            brandName: workspace?.name ?? "Kool",
            discountCode,
            commissionPct: row.commissionPct,
            onboardingUrl,
          }).catch(() => {}) // no bloqueamos si el email falla

          results.invited++
        }
      } catch (err) {
        results.errors.push({ email, reason: "Error al procesar" })
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 })
    }
    console.error("[Creators Import] Error:", error)
    return NextResponse.json({ error: "Error al importar" }, { status: 500 })
  }
}
