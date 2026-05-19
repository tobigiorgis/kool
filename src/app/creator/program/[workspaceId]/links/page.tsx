"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Copy, Check, ExternalLink, MousePointerClick } from "lucide-react"

interface LinkData {
  id: string
  slug: string
  destination: string
  clickCount: number
  discountCode: string | null
  title: string | null
}

export default function LinksPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const [links, setLinks] = useState<LinkData[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/creator/programs/${workspaceId}/links`)
      .then((r) => r.json())
      .then((d) => {
        setLinks(d.links ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workspaceId])

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://kool.link/${slug}`)
    setCopiedId(slug)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Mis links</h1>
          <p className="text-sm text-gray-500 mt-1">
            Links de afiliado para compartir con tu comunidad.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">Todavía no tenés links asignados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {link.title && (
                      <p className="text-sm font-semibold text-gray-900 mb-1">{link.title}</p>
                    )}
                    <p className="text-sm font-mono text-gray-700">
                      kool.link/{link.slug}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 truncate">{link.destination}</p>
                    {link.discountCode && (
                      <p className="text-xs text-gray-500 mt-1">
                        Código: <span className="font-mono font-medium">{link.discountCode}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MousePointerClick size={13} />
                      {link.clickCount.toLocaleString()} clics
                    </div>
                    <a
                      href={link.destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => copyLink(link.slug)}
                      className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      {copiedId === link.slug ? (
                        <>
                          <Check size={13} className="text-green-500" />
                          <span className="text-green-600">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="text-gray-500" />
                          <span className="text-gray-600">Copiar link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
