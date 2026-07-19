import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { z } from "zod"

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { name: workspaceName, slug } = CreateWorkspaceSchema.parse(body)

    // Check slug availability
    const existing = await prisma.workspace.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: "Este slug ya está en uso. Probá con otro." },
        { status: 409 }
      )
    }

    // Get Clerk user info to sync to our DB
    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ""
    const userName = clerkUser?.fullName ?? clerkUser?.firstName ?? undefined
    const avatar = clerkUser?.imageUrl ?? undefined

    // Upsert the User in our DB. If a record with the same email but a different
    // Clerk ID already exists (e.g. creator added by a brand before onboarding),
    // update their Clerk ID via raw SQL — only safe when no FK references exist.
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      include: {
        creatorProfile: { select: { userId: true } },
        workspaces: { select: { userId: true }, take: 1 },
      },
    })

    if (existingByEmail && existingByEmail.id !== userId) {
      const oldId = existingByEmail.id
      const hasReferences = !!existingByEmail.creatorProfile?.userId || existingByEmail.workspaces.length > 0
      if (hasReferences) {
        return NextResponse.json(
          { error: "Este email ya está asociado a otra cuenta. Usá otro email o contactá soporte." },
          { status: 409 }
        )
      }
      await prisma.$executeRaw`UPDATE users SET id = ${userId} WHERE id = ${oldId}`
    } else {
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId, email, name: userName, avatar, role: "BRAND" },
        update: { role: "BRAND" },
      })
    }

    // Create workspace + member atomically
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({ data: { name: workspaceName, slug } })
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId, role: "OWNER" },
      })
      return ws
    })

    return NextResponse.json({ ok: true, workspace })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    logger.error("[Workspace] POST", error)
    return NextResponse.json({ error: "Error al crear el workspace" }, { status: 500 })
  }
}
