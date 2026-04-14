"use client"

import { useState } from "react"
import { Plus, Instagram, Mail, Gift, Link2, MoreHorizontal } from "lucide-react"

const MOCK_CREATORS = [
  {
    id: "1", name: "Camila Ruiz", email: "camila@email.com",
    instagram: "camilaruiz", tier: "GOLD", status: "ACTIVE",
    discountCode: "CAMILA15", commissionPct: 15,
    clicks: 1284, conversions: 42, pendingAmount: 8400,
    niche: "Moda", audienceSize: 45000,
  },
  {
    id: "2", name: "Martina López", email: "marti@email.com",
    instagram: "martinaok", tier: "SILVER", status: "ACTIVE",
    discountCode: "MARTI10", commissionPct: 10,
    clicks: 891, conversions: 28, pendingAmount: 4200,
    niche: "Lifestyle", audienceSize: 22000,
  },
  {
    id: "3", name: "Sofía Gómez", email: "sofi@email.com",
    instagram: "sofiagomez", tier: "BRONZE", status: "PENDING",
    discountCode: "SOFI10", commissionPct: 10,
    clicks: 0, conversions: 0, pendingAmount: 0,
    niche: "Fitness", audienceSize: 8000,
  },
]

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

export default function CreatorsPage() {
  const [showInvite, setShowInvite] = useState(false)

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

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Creators activos</p>
          <p className="text-2xl font-semibold text-gray-900">
            {MOCK_CREATORS.filter((c) => c.status === "ACTIVE").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Conversiones totales</p>
          <p className="text-2xl font-semibold text-gray-900">
            {MOCK_CREATORS.reduce((s, c) => s + c.conversions, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Comisiones pendientes</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${MOCK_CREATORS.reduce((s, c) => s + c.pendingAmount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Creator</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Tier</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Código</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Clics</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Ventas</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Comisión pend.</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MOCK_CREATORS.map((creator) => (
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
                  <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {creator.discountCode}
                  </span>
                  <span className="text-xs text-gray-400 ml-1.5">{creator.commissionPct}%</span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700">
                  {creator.clicks.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-700">
                  {creator.conversions}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`text-sm font-medium ${creator.pendingAmount > 0 ? "text-brand-600" : "text-gray-400"}`}>
                    {creator.pendingAmount > 0 ? `$${creator.pendingAmount.toLocaleString()}` : "—"}
                  </span>
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
      </div>

      {showInvite && <InviteCreatorModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}

function InviteCreatorModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", instagram: "",
    commissionPct: "10", discountCode: "",
  })
  const [loading, setLoading] = useState(false)

  const handleNameChange = (name: string) => {
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
    setForm((f) => ({ ...f, name, discountCode: code + f.commissionPct }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Invitar creator</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Le llegará un email con el link de onboarding y su código de descuento.
          </p>
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
