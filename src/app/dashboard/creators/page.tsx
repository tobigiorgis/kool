"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Instagram, Mail, Gift, Link2, RefreshCw } from "lucide-react"
import { generateDiscountCode } from "@/lib/utils"

interface Creator {
  id: string
  name: string
  email: string
  instagram: string | null
  tier: string
  status: string
  discountCode: string | null
  commissionPct: number
  niche: string | null
  audienceSize: number | null
  _count: { conversions: number }
}

const TIER_STYLES: Record<string, string> = {
  GOLD: "bg-amber-100 text-amber-700",
  SILVER: "bg-gray-100 text-gray-600",
  BRONZE: "bg-orange-100 text-orange-700",
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  INACTIVE: "bg-gray-100 text-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
  INACTIVE: "Inactivo",
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await fetch("/api/workspace/me")
      if (!wsRes.ok) return
      const { workspace } = await wsRes.json()
      if (!workspace) return

      setWorkspaceId(workspace.id)
      const res = await fetch(`/api/creators?workspaceId=${workspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setCreators(data.creators)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const active = creators.filter((c) => c.status === "ACTIVE").length
  const totalConversions = creators.reduce((s, c) => s + (c._count?.conversions ?? 0), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Creators</h1>
          <p className="text-sm text-gray-500 mt-1">Gestioná tu programa de afiliados</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500"
        >
          <Plus size={16} />
          Invitar creator
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Creators activos</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Conversiones totales</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : totalConversions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total invitados</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : creators.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : creators.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">Todavía no invitaste ningún creator.</p>
            <button
              onClick={() => setShowInvite(true)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Invitar primer creator →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Creator</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Código</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Ventas</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {creators.map((creator) => (
                <tr key={creator.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold">
                        {creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{creator.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{creator.email}</span>
                          {creator.instagram && (
                            <a
                              href={`https://instagram.com/${creator.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-pink-500"
                            >
                              <Instagram size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_STYLES[creator.tier]}`}>
                      {creator.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[creator.status]}`}>
                      {STATUS_LABELS[creator.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {creator.discountCode ? (
                      <>
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {creator.discountCode}
                        </span>
                        <span className="text-xs text-gray-400 ml-1.5">{creator.commissionPct}%</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">
                    {creator._count?.conversions ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/dashboard/gifting?creatorId=${creator.id}`}
                        title="Enviar gifting"
                        className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg"
                      >
                        <Gift size={14} />
                      </a>
                      <a
                        href={`/dashboard/links?creatorId=${creator.id}`}
                        title="Ver links"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Link2 size={14} />
                      </a>
                      <a
                        href={`/dashboard/briefing?creatorId=${creator.id}`}
                        title="Enviar briefing"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Mail size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && workspaceId && (
        <InviteCreatorModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

function InviteCreatorModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: "", email: "", instagram: "",
    commissionPct: "10", discountCode: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleNameChange = (name: string) => {
    const code = generateDiscountCode(name, parseInt(form.commissionPct) || 10)
    setForm((f) => ({ ...f, name, discountCode: code }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: form.name,
          email: form.email,
          instagram: form.instagram || undefined,
          commissionPct: parseFloat(form.commissionPct),
          discountCode: form.discountCode || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al invitar creator")
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
          <h2 className="text-base font-semibold text-gray-900">Invitar creator</h2>
          <p className="text-xs text-gray-500 mt-0.5">Le llegará un email con su código de descuento.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Camila Ruiz"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="camila@email.com"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Instagram</label>
            <div className="flex">
              <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-400">@</span>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                placeholder="camilaruiz"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Comisión %</label>
              <input
                type="number"
                value={form.commissionPct}
                onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value }))}
                min="1" max="50"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Código de descuento</label>
              <input
                type="text"
                value={form.discountCode}
                onChange={(e) => setForm((f) => ({ ...f, discountCode: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50">
              {loading ? "Enviando..." : "Enviar invitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
