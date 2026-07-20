import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import { ensureTiendanubeCoupon } from "@/lib/api/coupon"

function generateSlug(name: string): string {
  const base = slugify(name).slice(0, 20)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${base}-${rand}`
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.link.findUnique({ where: { slug } })
    if (!existing) return slug
    slug = `${slugify(base).slice(0, 20)}-${Math.random().toString(36).slice(2, 6)}`
  }
  return slug
}

/**
 * Crea el link de afiliado de un creator para una campaña al aceptar una
 * invitación, si todavía no tiene uno. Usa la URL de la tienda Tiendanube
 * conectada como destino por defecto — si la marca no tiene tienda conectada
 * no hay a dónde apuntar el link, así que no se crea (queda para "Crear link"
 * manual una vez que conecten la tienda).
 */
export async function ensureAffiliateLink(params: {
  creatorId: string
  campaignId: string
  creatorName: string
  discountCode?: string | null
  discountPct?: number | null
}): Promise<void> {
  const { creatorId, campaignId, creatorName, discountCode, discountPct } = params

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return

  // Asegurar el cupón en la tienda aunque el link ya exista: el código pudo
  // haberse asignado sin que el cupón se llegara a crear (idempotente).
  await ensureTiendanubeCoupon({ workspaceId: campaign.workspaceId, code: discountCode, discountPct })

  const existingLink = await prisma.link.findFirst({ where: { creatorId, campaignId } })
  if (existingLink) return

  const connection = await prisma.tiendanubeConnection.findUnique({
    where: { workspaceId: campaign.workspaceId },
  })
  if (!connection?.storeUrl) return

  const slug = await ensureUniqueSlug(generateSlug(creatorName))
  await prisma.link.create({
    data: {
      workspaceId: campaign.workspaceId,
      creatorId,
      campaignId,
      slug,
      destination: connection.storeUrl,
      discountCode: discountCode || undefined,
      utmSource: slugify(creatorName),
      utmMedium: "influencer",
      utmCampaign: discountCode || undefined,
    },
  })
}
