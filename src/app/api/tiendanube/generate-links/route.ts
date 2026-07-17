import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import { decrypt } from "@/lib/utils/crypto"
import { getTiendanubeStore } from "@/lib/tiendanube"
import { ok, fail, unauthorized, handleError } from "@/lib/api/response"
import { logger } from "@/lib/logger"

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base
  let attempts = 0
  while (attempts < 5) {
    const existing = await prisma.link.findUnique({ where: { slug } })
    if (!existing) return slug
    slug = `${base.slice(0, 16)}-${Math.random().toString(36).slice(2, 6)}`
    attempts++
  }
  return slug
}

export async function POST() {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
    })
    if (!member) return fail("No workspace", 403)

    const { workspaceId } = member

    const connection = await prisma.tiendanubeConnection.findUnique({
      where: { workspaceId },
    })
    if (!connection?.active) {
      return fail("Tiendanube no está conectado", 400)
    }

    // Always fetch from TN API to get the current store URL
    const accessToken = decrypt(connection.accessToken)
    const store = await getTiendanubeStore(connection.storeId, accessToken)
    const storeUrl = store.url || (store.main_domain ? `https://${store.main_domain}` : null)

    if (!storeUrl) {
      return fail("No se encontró la URL de la tienda en Tiendanube", 400)
    }

    const campaignCreators = await prisma.campaignCreator.findMany({
      where: { campaign: { workspaceId } },
      include: {
        creator: { select: { id: true, name: true } },
        campaign: { select: { id: true, workspaceId: true } },
      },
    })

    let created = 0
    for (const cc of campaignCreators) {
      const existing = await prisma.link.findFirst({
        where: { creatorId: cc.creatorId, campaignId: cc.campaignId },
      })
      if (existing) continue

      const base = slugify(cc.creator.name).slice(0, 20)
      const slug = await ensureUniqueSlug(base)

      await prisma.link.create({
        data: {
          workspaceId,
          creatorId: cc.creatorId,
          campaignId: cc.campaignId,
          slug,
          destination: storeUrl,
          discountCode: cc.discountCode,
          utmSource: slugify(cc.creator.name),
          utmMedium: "influencer",
          utmCampaign: cc.discountCode || undefined,
        },
      })
      created++
    }

    logger.info("[generate-links] Done", "done", { workspaceId, created })
    return ok({ created })
  } catch (error) {
    return handleError("[generate-links] POST", error)
  }
}
