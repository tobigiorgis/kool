"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Loader2, Tag } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Invite {
  id: string
  campaignId: string
  campaignName: string
  brandName: string
  brandLogo: string | null
  brandColor: string | null
  discountCode: string | null
  commissionPct: number
}

export default function InvitationsPage() {
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/creator/invitations")
      .then((r) => r.json())
      .then((d) => setInvites(d.invites ?? []))
      .finally(() => setLoading(false))
  }, [])

  const respond = async (inviteId: string, action: "accept" | "decline") => {
    setResponding(inviteId)
    try {
      await fetch(`/api/creator/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      if (action === "accept") router.refresh()
    } finally {
      setResponding(null)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Invitations</h1>
        <p className="text-sm text-gray-400 mt-0.5">Invitaciones a programas de marcas</p>
      </div>
      <div className="border-t border-gray-200 mb-6" />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">No tenés invitaciones pendientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <BrandLogo name={invite.brandName} logo={invite.brandLogo} color={invite.brandColor} size={44} />

              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-gray-900">{invite.brandName}</p>
                <p className="text-sm text-gray-500 mt-0.5">{invite.campaignName}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                    {invite.commissionPct}% comisión
                  </span>
                  {invite.discountCode && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Tag size={10} />
                      <span className="font-mono">{invite.discountCode}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => respond(invite.id, "decline")}
                  disabled={responding === invite.id}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40"
                >
                  {responding === invite.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
                <button
                  onClick={() => respond(invite.id, "accept")}
                  disabled={responding === invite.id}
                  className="px-4 h-9 flex items-center gap-1.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
                >
                  <Check size={13} />
                  Aceptar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BrandLogo({ name, logo, color, size }: { name: string; logo: string | null; color: string | null; size: number }) {
  if (logo) {
    return <img src={logo} className="rounded-xl object-cover shrink-0" style={{ width: size, height: size }} alt={name} />
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: color ?? "#111827" }}
    >
      <span className="text-white font-bold" style={{ fontSize: Math.round(size * 0.44) }}>
        {name[0]?.toUpperCase()}
      </span>
    </div>
  )
}
