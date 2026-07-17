"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Copy, BarChart2, Link2, ExternalLink, RefreshCw } from "lucide-react"
import { buildShortUrl, shortUrlLabel } from "@/lib/links"
import { CreateLinkModal } from "@/components/CreateLinkModal"

interface LinkData {
  id: string
  slug: string
  destination: string
  discountCode: string | null
  creator: { id: string; name: string; discountCode: string | null } | null
  campaign: { id: string; name: string } | null
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

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(buildShortUrl(slug))
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6 lg:mb-8">
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Link</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">Campaña</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">Creator</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Código</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Link2 size={14} className="text-brand-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {shortUrlLabel(link.slug)}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px] sm:max-w-[200px]">
                            {link.destination}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {link.campaign ? (
                        <span className="text-sm text-gray-700">{link.campaign.name}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {link.creator ? (
                        <span className="text-sm text-gray-700">{link.creator.name}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {link.discountCode ? (
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {link.discountCode}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
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
          </div>
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

