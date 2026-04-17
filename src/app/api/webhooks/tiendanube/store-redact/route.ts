import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const body = await request.json()
  const storeId = body.store_id?.toString()
  if (storeId) {
    await prisma.tiendanubeConnection.deleteMany({ where: { storeId } })
  }
  return Response.json({ ok: true })
}
