"use client"

import { useState } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

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

export function PendingInvites({ invites }: { invites: Invite[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const respond = async (inviteId: string, action: "accept" | "decline") => {
    setLoading(inviteId)
    try {
      const res = await fetch(`/api/creator/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setDismissed((d) => new Set([...d, inviteId]))
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  const visible = invites.filter((i) => !dismissed.has(i.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      {visible.map((invite) => {
        const initials = invite.brandName.slice(0, 2).toUpperCase()
        const isLoading = loading === invite.id

        return (
          <div
            key={invite.id}
            className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center gap-4"
          >
            {/* Brand logo */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: invite.brandColor ?? "#F8BBD0" }}
            >
              {invite.brandLogo ? (
                <img src={invite.brandLogo} alt="" className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span className="text-gray-700">{initials}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {invite.brandName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {invite.campaignName}
                {invite.discountCode && (
                  <span className="ml-2 font-mono text-gray-400">·  {invite.discountCode}</span>
                )}
              </p>
            </div>

            {/* Commission badge */}
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full shrink-0">
              {invite.commissionPct}% comisión
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => respond(invite.id, "decline")}
                disabled={isLoading}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40"
                title="Declinar"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              </button>
              <button
                onClick={() => respond(invite.id, "accept")}
                disabled={isLoading}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-40"
                title="Aceptar"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
