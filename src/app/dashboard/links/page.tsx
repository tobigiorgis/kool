"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Copy, BarChart2, Link2, ExternalLink, RefreshCw } from "lucide-react"

interface LinkData {
  id: string
  slug: string
  destination: string
  discountCode: string | null
  creator: { id: string; name: string; discountCode: string | null } | null
  createdAt: string
}

export default function LinksPage() {
  const [links, setLinks] = useState<LinkData[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await fetch("/api/workspace/me")
      if (!wsRes.ok) return
      const { workspace } = await wsRes.json()
      if (!workspace) return

      setWorkspaceId(workspace.id)
      const linksRes = await fetch(`/api/links?workspaceId=${workspace.id}`)
      if (linksRes.ok) {
        const data = await linksRes.json()
        setLinks(data.links)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://kool.link/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8">
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

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : links.length === 0 ? (
          <div className="p-10 text-center">
            <Link2 size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-4">Todavía no creaste ningún link.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Crear primer link →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Link</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Creator</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Código</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Link2 size={14} className="text-brand-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">kool.link/{link.slug}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{link.destination}</p>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => copyLink(link.slug)}
                        title={copied === link.slug ? "¡Copiado!" : "Copiar link"}
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
        )}
      </div>

      {showCreate && workspaceId && (
        <CreateLinkModal
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

function CreateLinkModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [destination, setDestination] = useState("")
  const [slug, setSlug] = useState("")
  const [discountCode, setDiscountCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, destination, slug: slug || undefined, discountCode: discountCode || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear el link")
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
          <h2 className="text-base font-semibold text-gray-900">Crear nuevo link</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">URL de destino</label>
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Slug personalizado</label>
            <div className="flex">
              <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
                kool.link/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="mi-link (opcional)"
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
