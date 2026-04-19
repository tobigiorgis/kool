/**
 * Kool — Tiendanube OAuth: inicio de flujo
 * GET /api/auth/tiendanube
 *
 * Construye la URL de autorización y redirige al merchant a Tiendanube.
 * Más simple que /connect — no necesita JSON de por medio.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const member = await prisma.workspaceMember.findFirst({
    where: { user: { id: userId } },
    select: { workspaceId: true },
  })

  const state = member?.workspaceId || "no-workspace"

  const params = new URLSearchParams({
    client_id: process.env.TIENDANUBE_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.TIENDANUBE_REDIRECT_URI!,
    scope: "write_orders read_orders write_coupons read_products write_scripts",
    state,
  })

  redirect(
    `https://www.tiendanube.com/apps/${process.env.TIENDANUBE_CLIENT_ID}/authorize?${params}`
  )
}
