"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { creatorPath } from "@/lib/host"
import { formatCurrency } from "@/lib/utils"
import { ArrowRight, TrendingUp, MousePointerClick, ShoppingBag, Trophy } from "lucide-react"
import { Loader2 } from "lucide-react"

interface Overview {
  lastCampaign: {
    campaignId: string
    campaignName: string
    brandName: string
    brandLogo: string | null
    brandColor: string | null
  } | null
  stats: { clicks: number; conversions: number; earned: number }
  recentEarnings: {
    id: string
    amount: number
    status: string
    createdAt: string
    conversion: {
      orderAmount: number
      link: { slug: string; campaignId: string | null } | null
    } | null
  }[]
  latestBounty: {
    id: string
    name: string
    campaign: { id: string; name: string }
    tiers: { id: string; threshold: number; reward: string; rewardType: string }[]
    achievements: { tierId: string }[]
  } | null
}

function BrandLogo({ name, logo, color, size }: { name: string; logo: string | null; color: string | null; size: number }) {
  if (logo) return <img src={logo} className="rounded-xl object-cover shrink-0" style={{ width: size, height: size }} alt={name} />
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, backgroundColor: color ?? "#111827" }}>
      <span className="text-white font-bold" style={{ fontSize: Math.round(size * 0.45) }}>{name[0]?.toUpperCase()}</span>
    </div>
  )
}

export default function CreatorOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/creator/overview")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    )
  }

  const { lastCampaign, stats, recentEarnings, latestBounty } = data ?? {
    lastCampaign: null, stats: { clicks: 0, conversions: 0, earned: 0 }, recentEarnings: [], latestBounty: null,
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Últimos 30 días</p>
      </div>
      <div className="border-t border-gray-200" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <MousePointerClick size={13} className="text-gray-400" />
            <p className="text-[11px] text-gray-400">Clicks</p>
          </div>
          <p className="text-xl font-semibold text-gray-900 tracking-tight">{stats.clicks.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ShoppingBag size={13} className="text-gray-400" />
            <p className="text-[11px] text-gray-400">Ventas</p>
          </div>
          <p className="text-xl font-semibold text-gray-900 tracking-tight">{stats.conversions.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={13} className="text-gray-400" />
            <p className="text-[11px] text-gray-400">Ganado</p>
          </div>
          <p className="text-xl font-semibold text-gray-900 tracking-tight">{formatCurrency(stats.earned)}</p>
        </div>
      </div>

      {/* Last campaign */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-gray-900">Última campaña</p>
          <Link href={creatorPath("programs")} className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
            Ver todas →
          </Link>
        </div>
        {lastCampaign ? (
          <Link
            href={creatorPath(`program/${lastCampaign.campaignId}`)}
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <BrandLogo name={lastCampaign.brandName} logo={lastCampaign.brandLogo} color={lastCampaign.brandColor} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900 truncate">{lastCampaign.brandName}</p>
              <p className="text-[11px] text-gray-400 truncate">{lastCampaign.campaignName}</p>
            </div>
            <ArrowRight size={15} className="text-gray-300 shrink-0" />
          </Link>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-400">No estás en ninguna campaña todavía.</p>
          </div>
        )}
      </div>

      {/* Latest bounty */}
      {latestBounty && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-gray-900">Objetivo activo</p>
            <Link href={creatorPath(`program/${latestBounty.campaign.id}`)} className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
              Ver campaña →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-amber-500" />
              <p className="text-[13px] font-semibold text-gray-900">{latestBounty.name}</p>
              <span className="text-[11px] text-gray-400 ml-auto">{latestBounty.campaign.name}</span>
            </div>
            <div className="space-y-2">
              {latestBounty.tiers.map((tier) => {
                const achieved = latestBounty.achievements.some((a) => a.tierId === tier.id)
                return (
                  <div key={tier.id} className={`flex items-center justify-between text-[12px] py-1.5 px-3 rounded-xl ${achieved ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}`}>
                    <span>{tier.threshold} ventas</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{tier.reward}</span>
                      {achieved && <span className="text-green-500">✓</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent earnings */}
      {recentEarnings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-gray-900">Últimas ganancias</p>
            <Link href={creatorPath("earnings")} className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {recentEarnings.map((e, i) => (
              <div key={e.id} className={`flex items-center justify-between px-4 py-3 ${i !== recentEarnings.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div>
                  <p className="text-[13px] font-medium text-gray-900">{formatCurrency(e.amount)}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(e.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  e.status === "PAID" ? "bg-green-100 text-green-700" :
                  e.status === "APPROVED" ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {e.status === "PAID" ? "Pagado" : e.status === "APPROVED" ? "Aprobado" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
