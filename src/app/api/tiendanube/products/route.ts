import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getTiendanubeProducts } from "@/lib/tiendanube"
import { decrypt } from "@/lib/utils/crypto"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = request.nextUrl.searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  const connection = await prisma.tiendanubeConnection.findUnique({
    where: { workspaceId },
  })
  if (!connection?.active) {
    return NextResponse.json({ error: "Tiendanube not connected" }, { status: 422 })
  }

  try {
    const accessToken = decrypt(connection.accessToken)
    // Fetch first 2 pages (100 products max) in parallel
    const [page1, page2] = await Promise.allSettled([
      getTiendanubeProducts(connection.storeId, accessToken, 1),
      getTiendanubeProducts(connection.storeId, accessToken, 2),
    ])

    const products = [
      ...(page1.status === "fulfilled" ? page1.value : []),
      ...(page2.status === "fulfilled" ? page2.value : []),
    ]

    return NextResponse.json({ products })
  } catch (error) {
    console.error("[Products] Error:", error)
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 })
  }
}
