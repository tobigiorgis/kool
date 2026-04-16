"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Megaphone, RefreshCw, Calendar, Users, Link2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Campaign {
  id: string
  name: string
  description: string | null
  status: "PRE_LAUNCH" | "RUNNING" | "COMPLETED"
  startDate: string | null
  endDate: string | null
  budget: number | null
  createdAt: string
  _count: { creators: number; links: number }
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  PRE_LAUNCH: { label: "Pre-launch", style: "bg-amber-100 text-amber-700" },
  RUNNING: { label: "Activa", style: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completada", style: "bg-gray-100 text-gray-500" },
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await fetch("/api/workspace/me")
      if (!wsRes.ok) return
      const { workspace } = await wsRes.json()
      if (!workspace) return

      setWorkspaceId(workspace.id)
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

  const running = campaigns.filter((c) => c.status === "RUNNING").length
  const preLaunch = campaigns.filter((c) => c.status === "PRE_LAUNCH").length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-1">Organizá tus acciones con creators por campaña</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          Nueva campaña
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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
              onClick={() => setShowCreate(true)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Crear primera campaña
            </button>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const cfg = STATUS_CONFIG[campaign.status]
            return (
              <a
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-[15px] font-semibold text-gray-900 truncate">{campaign.name}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-[13px] text-gray-400 truncate mb-3">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                        <Users size={12} />
                        <span>{campaign._count.creators} creators</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                        <Link2 size={12} />
                        <span>{campaign._count.links} links</span>
                      </div>
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
                </div>
              </a>
            )
          })
        )}
      </div>

      {showCreate && workspaceId && (
        <CreateCampaignModal
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

function CreateCampaignModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: form.name,
          description: form.description || undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          budget: form.budget ? parseFloat(form.budget) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear campaña")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nueva campaña</h2>
          <p className="text-xs text-gray-500 mt-0.5">Agrupá creators, links y briefings bajo una campaña.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Lanzamiento verano 2026"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Objetivo de la campaña, productos involucrados..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Presupuesto <span className="text-gray-400 font-normal">(ARS, opcional)</span>
            </label>
            <input
              type="number"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              placeholder="50000"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !form.name}
              className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear campaña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
