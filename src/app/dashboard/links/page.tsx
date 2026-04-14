"use client"

import { useState } from "react"
import { Plus, Copy, BarChart2, Link2, Trash2, ExternalLink } from "lucide-react"

// Datos mock para desarrollo — en producción viene de la API
const MOCK_LINKS = [
  {
    id: "1", slug: "camila-verano", destination: "https://tienda.com/verano",
    creator: { name: "Camila Ruiz" }, discountCode: "CAMILA15",
    clicks: 642, conversions: 18, createdAt: "2026-04-01",
  },
  {
    id: "2", slug: "nike-zapatillas", destination: "https://www.mercadolibre.com.ar/nike",
    creator: { name: "Martina López" }, discountCode: null,
    clicks: 391, conversions: 0, createdAt: "2026-04-03",
  },
  {
    id: "3", slug: "promo-bloom", destination: "https://mitienda.tiendanube.com/coleccion/bloom",
    creator: null, discountCode: "BLOOM20",
    clicks: 251, conversions: 9, createdAt: "2026-04-10",
  },
]

export default function LinksPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://kool.link/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Links</h1>
          <p className="text-sm text-gray-500 mt-1">Creá y gestioná tus links de tracking</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
        >
          <Plus size={16} />
          Nuevo link
        </button>
      </div>

      {/* Tabla de links */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Link</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Creator</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Código</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Clics</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Conversiones</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MOCK_LINKS.map((link) => (
              <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Link2 size={14} className="text-brand-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        kool.link/{link.slug}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">
                        {link.destination}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {link.creator ? (
                    <span className="text-sm text-gray-700">{link.creator.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {link.discountCode ? (
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {link.discountCode}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {link.clicks.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`text-sm font-medium ${link.conversions > 0 ? "text-brand-600" : "text-gray-400"}`}>
                    {link.conversions > 0 ? link.conversions : "—"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => copyLink(link.slug)}
                      title="Copiar link"
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      href={`/dashboard/analytics?linkId=${link.id}`}
                      title="Ver analytics"
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <BarChart2 size={14} />
                    </a>
                    <a
                      href={link.destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir destino"
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear link */}
      {showCreate && <CreateLinkModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateLinkModal({ onClose }: { onClose: () => void }) {
  const [destination, setDestination] = useState("")
  const [slug, setSlug] = useState("")
  const [discountCode, setDiscountCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // TODO: llamar a POST /api/links
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Crear nuevo link</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              URL de destino
            </label>
            <input
              type="url"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="https://mitienda.tiendanube.com/producto"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Slug personalizado
            </label>
            <div className="flex">
              <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
                kool.link/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="mi-link"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Código de descuento <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="CAMILA15"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se aplica automáticamente en el checkout de Tiendanube.
            </p>
          </div>
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
              disabled={loading || !destination}
              className="flex-1 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
