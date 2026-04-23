"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Megaphone, RefreshCw, Calendar, Users, Link2, ExternalLink, Copy, Check, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kool-beta.vercel.app"

interface Campaign {
  id: string
  name: string
  description: string | null
  status: "PRE_LAUNCH" | "RUNNING" | "COMPLETED"
  formStatus: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  slug: string | null
  createdAt: string
  _count: { creators: number; links: number; applications: number }
  pendingApplications: number
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  PRE_LAUNCH: { label: "Pre-launch", style: "bg-amber-100 text-amber-700" },
  RUNNING: { label: "Activa", style: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completada", style: "bg-gray-100 text-gray-500" },
}

const FORM_STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  ACTIVE: { label: "Recibiendo", style: "bg-emerald-100 text-emerald-700" },
  PAUSED:  { label: "Pausada",   style: "bg-yellow-100 text-yellow-700" },
  CLOSED:  { label: "Cerrada",   style: "bg-gray-100 text-gray-500" },
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await fetch("/api/workspace/me")
      if (!wsRes.ok) return
      const { workspace } = await wsRes.json()
      if (!workspace) return

      const res = await fetch(`/api/campaigns?workspaceId=${workspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const copyLink = (slug: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(`${BASE_URL}/apply/${slug}`)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const running = campaigns.filter((c) => c.status === "RUNNING").length
  const preLaunch = campaigns.filter((c) => c.status === "PRE_LAUNCH").length
  const totalPending = campaigns.reduce((s, c) => s + (c.pendingApplications ?? 0), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-1">Organizá tus acciones con creators por campaña</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/campaigns/new")}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          Nueva campaña
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total campañas</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : campaigns.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Activas</p>
          <p className="text-2xl font-semibold text-green-600">{loading ? "—" : running}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Pre-launch</p>
          <p className="text-2xl font-semibold text-amber-600">{loading ? "—" : preLaunch}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Aplicaciones pendientes</p>
          <p className="text-2xl font-semibold text-brand-600">{loading ? "—" : totalPending}</p>
        </div>
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <Megaphone size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-4">Todavía no creaste ninguna campaña.</p>
            <button
              onClick={() => router.push("/dashboard/campaigns/new")}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Crear primera campaña
            </button>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const cfg = STATUS_CONFIG[campaign.status]
            const formCfg = campaign.slug ? FORM_STATUS_CONFIG[campaign.formStatus] : null
            return (
              <a
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-[15px] font-semibold text-gray-900 truncate">{campaign.name}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>
                        {cfg.label}
                      </span>
                      {formCfg && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${formCfg.style}`}>
                          Aplicaciones: {formCfg.label}
                        </span>
                      )}
                      {campaign.pendingApplications > 0 && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-brand-50 text-brand-700">
                          <Clock size={10} />
                          {campaign.pendingApplications} pendiente{campaign.pendingApplications !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {campaign.description && (
                      <p className="text-[13px] text-gray-400 truncate mb-2">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                        <Users size={12} />
                        <span>{campaign._count.creators} creators</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                        <Link2 size={12} />
                        <span>{campaign._count.links} links</span>
                      </div>
                      {campaign.slug && (
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                          <Megaphone size={12} />
                          <span>{campaign._count.applications} aplicaciones</span>
                        </div>
                      )}
                      {(campaign.startDate || campaign.endDate) && (
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                          <Calendar size={12} />
                          <span>
                            {campaign.startDate ? formatDate(campaign.startDate) : "—"}
                            {" → "}
                            {campaign.endDate ? formatDate(campaign.endDate) : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Landing page link */}
                  {campaign.slug && (
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <button
                        onClick={(e) => copyLink(campaign.slug!, e)}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        {copiedSlug === campaign.slug ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                        {copiedSlug === campaign.slug ? "Copiado" : "Copiar link"}
                      </button>
                      <a
                        href={`${BASE_URL}/apply/${campaign.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Ver landing"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
