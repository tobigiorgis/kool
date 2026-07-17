"use client"

import { useEffect, useState } from "react"
import { Loader2, Copy, ExternalLink, Check } from "lucide-react"
import { creatorPath } from "@/lib/host"
import Link from "next/link"

interface CreatorLink {
  id: string
  slug: string
  shortUrl: string
  destination: string
  discountCode: string | null
  createdAt: string
  clicks: number
  conversions: number
  campaign: {
    id: string
    name: string
    brandName: string
    brandLogo: string | null
    brandColor: string | null
  } | null
}

function BrandLogo({ name, logo, color, size }: { name: string; logo: string | null; color: string | null; size: number }) {
  if (logo) return <img src={logo} className="rounded-lg object-cover shrink-0" style={{ width: size, height: size }} alt={name} />
  return (
    <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: size, height: size, backgroundColor: color ?? "#111827" }}>
      <span className="text-white font-bold" style={{ fontSize: Math.round(size * 0.45) }}>{name[0]?.toUpperCase()}</span>
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

export default function CreatorLinksPage() {
  const [links, setLinks] = useState<CreatorLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/creator/links")
      .then((r) => r.json())
      .then((d) => setLinks(d.links ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Links</h1>
        <p className="text-sm text-gray-400 mt-0.5">{links.length} link{links.length !== 1 ? "s" : ""} activo{links.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="border-t border-gray-200" />

      {links.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-400">No tenés links todavía.</p>
          <p className="text-xs text-gray-300 mt-1">Se crean cuando te agregan a una campaña.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              {/* Brand + campaign */}
              {link.campaign && (
                <Link href={creatorPath(`program/${link.campaign.id}`)} className="flex items-center gap-2.5 group">
                  <BrandLogo name={link.campaign.brandName} logo={link.campaign.brandLogo} color={link.campaign.brandColor} size={28} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors truncate">{link.campaign.brandName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{link.campaign.name}</p>
                  </div>
                </Link>
              )}

              {/* Link URL */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-[12px] font-mono text-gray-700 flex-1 truncate">{link.shortUrl}</span>
                <CopyBtn text={link.shortUrl} />
                <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl py-2">
                  <p className="text-[15px] font-semibold text-gray-900">{link.clicks.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">Clicks</p>
                </div>
                <div className="bg-gray-50 rounded-xl py-2">
                  <p className="text-[15px] font-semibold text-gray-900">{link.conversions.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">Ventas</p>
                </div>
                <div className="bg-gray-50 rounded-xl py-2">
                  <p className="text-[15px] font-semibold text-gray-900">
                    {link.clicks > 0 ? `${((link.conversions / link.clicks) * 100).toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400">Conv.</p>
                </div>
              </div>

              {link.discountCode && (
                <div className="flex items-center justify-between bg-pink-50 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-gray-500">Código de descuento</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-mono font-semibold text-pink-600">{link.discountCode}</span>
                    <CopyBtn text={link.discountCode} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
