/**
 * Kool — Lógica de bounties (objetivos con recompensa)
 *
 * Un bounty pertenece a una campaña y tiene uno o más "tiers" (escalones).
 * Cada tier define un umbral (cantidad de ventas o monto de revenue) y una
 * recompensa. Cuando un creator cruza el umbral, se crea un BountyAchievement.
 */

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import type { BountyMetric, BountyRewardType, Prisma } from "@prisma/client"

export interface CampaignProgress {
  salesCount: number
  revenue: number
}

/** Progreso acumulado de un creator dentro de una campaña. */
export async function getCampaignProgress(
  creatorId: string,
  campaignId: string
): Promise<CampaignProgress> {
  const agg = await prisma.conversion.aggregate({
    where: { creatorId, campaignId },
    _count: { _all: true },
    _sum: { orderAmount: true },
  })
  return {
    salesCount: agg._count._all,
    revenue: agg._sum.orderAmount ?? 0,
  }
}

/** Valor de progreso según la métrica del bounty. */
export function progressForMetric(progress: CampaignProgress, metric: BountyMetric): number {
  return metric === "REVENUE" ? progress.revenue : progress.salesCount
}

/** Etiqueta legible de una recompensa de tier. */
export function rewardLabel(tier: {
  rewardType: BountyRewardType
  rewardValue: number | null
  rewardProductName: string | null
  rewardDescription: string | null
  currency?: string
}): string {
  if (tier.rewardType === "CASH" && tier.rewardValue != null) {
    const fmt = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: tier.currency || "ARS",
      minimumFractionDigits: 0,
    })
    return `${fmt.format(tier.rewardValue)} en efectivo`
  }
  if (tier.rewardType === "PRODUCT") {
    return tier.rewardProductName || tier.rewardDescription || "Producto de regalo"
  }
  return tier.rewardDescription || "Recompensa"
}

export interface NewAchievement {
  achievementId: string
  bountyId: string
  bountyName: string
  metric: BountyMetric
  threshold: number
  rewardType: BountyRewardType
  reward: string
}

/**
 * Evalúa los bounties activos de una campaña para un creator y crea los
 * achievements de los tiers recién alcanzados. Idempotente: no duplica
 * achievements (unique [tierId, creatorId]).
 *
 * Devuelve los tiers recién logrados (para notificar por email).
 */
export async function evaluateBounties(
  creatorId: string,
  campaignId: string
): Promise<NewAchievement[]> {
  const now = new Date()
  const bounties = await prisma.bounty.findMany({
    where: {
      campaignId,
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    include: { tiers: true },
  })
  if (bounties.length === 0) return []

  const progress = await getCampaignProgress(creatorId, campaignId)

  // Tiers ya logrados por este creator (para no recrear)
  const tierIds = bounties.flatMap((b) => b.tiers.map((t) => t.id))
  const existing = await prisma.bountyAchievement.findMany({
    where: { creatorId, tierId: { in: tierIds } },
    select: { tierId: true },
  })
  const achievedTierIds = new Set(existing.map((e) => e.tierId))

  const newlyAchieved: NewAchievement[] = []

  for (const bounty of bounties) {
    const value = progressForMetric(progress, bounty.metric)
    for (const tier of bounty.tiers) {
      if (achievedTierIds.has(tier.id)) continue
      if (value < tier.threshold) continue

      try {
        const achievement = await prisma.bountyAchievement.create({
          data: {
            bountyId: bounty.id,
            tierId: tier.id,
            creatorId,
            progressValue: value,
            status: "ACHIEVED",
          },
        })
        newlyAchieved.push({
          achievementId: achievement.id,
          bountyId: bounty.id,
          bountyName: bounty.name,
          metric: bounty.metric,
          threshold: tier.threshold,
          rewardType: tier.rewardType,
          reward: rewardLabel(tier),
        })
      } catch (err) {
        // P2002: ya existe (carrera de webhooks) — ignorar
        if ((err as Prisma.PrismaClientKnownRequestError)?.code !== "P2002") {
          logger.error("[Bounties]", "Error creando achievement", { err })
        }
      }
    }
  }

  return newlyAchieved
}
