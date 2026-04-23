/**
 * Kool — Tiendanube OAuth: inicio de flujo
 * GET /api/auth/tiendanube
 *
 * Construye la URL de autorización y redirige al merchant a Tiendanube.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getTiendanubeAuthUrl } from "@/lib/tiendanube"

export async function GET() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const member = await prisma.workspaceMember.findFirst({
    where: { user: { id: userId } },
    select: { workspaceId: true },
  })

  if (!member) redirect("/onboarding")

  const url = getTiendanubeAuthUrl(member.workspaceId)
  redirect(url)
}
