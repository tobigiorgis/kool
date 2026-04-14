import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { name, slug } = CreateWorkspaceSchema.parse(body)

    // Check slug availability
    const existing = await prisma.workspace.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Este slug ya está en uso. Probá con otro." }, { status: 409 })
    }

    // Get Clerk user info to sync to our DB
    const clerkUser = await currentUser()

    // Upsert the User in our DB (using Clerk user ID as PK)
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? "",
        name: clerkUser?.fullName ?? clerkUser?.firstName ?? undefined,
        avatar: clerkUser?.imageUrl ?? undefined,
      },
      update: {},
    })

    // Create workspace + member atomically
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({ data: { name, slug } })
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
    console.error("[Workspace] Create error:", error)
    return NextResponse.json({ error: "Error al crear el workspace" }, { status: 500 })
  }
}
