import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/utils/crypto"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "missing workspaceId" }, { status: 400 })

  const connection = await prisma.tiendanubeConnection.findUnique({
    where: { workspaceId },
  })
  if (!connection) return NextResponse.json({ error: "no connection" }, { status: 404 })

  const accessToken = decrypt(connection.accessToken)

  const scriptsRes = await fetch(
    `https://api.tiendanube.com/2025-03/${connection.storeId}/scripts`,
    {
      headers: {
        Authentication: `bearer ${accessToken}`,
        "User-Agent": "Kool (hola@kool.link)",
      },
    }
  )
  const scripts = await scriptsRes.json()

  const webhooksRes = await fetch(
    `https://api.tiendanube.com/2025-03/${connection.storeId}/webhooks`,
    {
      headers: {
        Authentication: `bearer ${accessToken}`,
        "User-Agent": "Kool (hola@kool.link)",
      },
    }
  )
  const webhooks = await webhooksRes.json()

  return NextResponse.json({ scripts, webhooks, storeId: connection.storeId })
}
