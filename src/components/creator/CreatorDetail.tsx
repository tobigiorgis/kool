"use client"

import { useState } from "react"
import {
  X, Instagram, ExternalLink, Link2, Mail, Phone, MapPin,
  Calendar, DollarSign, MousePointerClick, ShoppingBag, Copy,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Commission {
  id: string
  amount: number
  orderAmount: number
  percentage: number
  status: string
  createdAt: string
}

interface CreatorLink {
  id: string
  slug: string
  destination: string
  sales: number
  revenue: number
}

interface CampaignEntry {
  commissionPct: number | null
  discountCode: string | null
  campaign: { id: string; name: string; formStatus: string }
}

interface Creator {
  id: string
  name: string
  email: string
  phone?: string | null
  avatar?: string | null
  instagram?: string | null
  instagramFollowers?: number | null
  tiktok?: string | null
  tiktokFollowers?: number | null
  city?: string | null
  country?: string | null
  niche?: string | null
  discountCode?: string | null
  commissionPct: number
  createdAt: string
  totalClicks: number
  totalSales: number
  totalRevenue: number
  totalCommissions: number
  pendingCommissions: number
  approvedCommissions: number
  paidCommissions: number
  links: CreatorLink[]
  commissions: Commission[]
  campaigns: CampaignEntry[]
}

type Tab = "overview" | "links" | "earnings" | "campaigns"

export function CreatorDetail({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  const initials = creator.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-gray-100 z-50 overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {creator.avatar ? (
              <img src={creator.avatar} alt={creator.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-rose-400">{initials}</span>
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">{creator.name}</h2>
              <p className="text-xs text-gray-400">{creator.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-100">
          <div className="flex">
            {(["overview", "links", "earnings", "campaigns"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                  activeTab === tab
                    ? "text-gray-900 border-gray-900"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "overview" && <OverviewTab creator={creator} />}
          {activeTab === "links" && <LinksTab links={creator.links} />}
          {activeTab === "earnings" && <EarningsTab creator={creator} />}
          {activeTab === "campaigns" && <CampaignsTab campaigns={creator.campaigns} />}
        </div>
      </div>
    </>
  )
}

function OverviewTab({ creator }: { creator: Creator }) {
  return (
    <div className="space-y-6">
      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile icon={<MousePointerClick size={12} />} label="Clicks" value={creator.totalClicks.toLocaleString()} />
        <MetricTile icon={<ShoppingBag size={12} />} label="Sales" value={creator.totalSales.toLocaleString()} />
        <MetricTile icon={<DollarSign size={12} />} label="Revenue" value={formatCurrency(creator.totalRevenue)} />
        <MetricTile
          icon={<DollarSign size={12} />}
          label="Commissions"
          value={formatCurrency(creator.totalCommissions)}
          accent
        />
      </div>

      {/* Details */}
      <div>
        <SectionLabel>Details</SectionLabel>
        <div className="space-y-3 mt-3">
          <InfoRow icon={<Mail size={13} />} label="Email" value={creator.email} />
          {creator.phone && <InfoRow icon={<Phone size={13} />} label="Teléfono" value={creator.phone} />}
          {(creator.city || creator.country) && (
            <InfoRow
              icon={<MapPin size={13} />}
              label="Ubicación"
              value={[creator.city, creator.country].filter(Boolean).join(", ")}
            />
          )}
          <InfoRow icon={<Calendar size={13} />} label="Se unió" value={formatDate(creator.createdAt)} />
          {creator.niche && <InfoRow icon={null} label="Nicho" value={creator.niche} />}
        </div>
      </div>

      {/* Social */}
      {(creator.instagram || creator.tiktok) && (
        <div>
          <SectionLabel>Social</SectionLabel>
          <div className="space-y-2 mt-3">
            {creator.instagram && (
              <a
                href={`https://instagram.com/${creator.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                  <Instagram size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">@{creator.instagram}</p>
                  {creator.instagramFollowers && (
                    <p className="text-xs text-gray-400">{creator.instagramFollowers.toLocaleString()} followers</p>
                  )}
                </div>
                <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
              </a>
            )}
            {creator.tiktok && (
              <a
                href={`https://tiktok.com/@${creator.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-bold tracking-tight">TK</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">@{creator.tiktok}</p>
                  {creator.tiktokFollowers && (
                    <p className="text-xs text-gray-400">{creator.tiktokFollowers.toLocaleString()} followers</p>
                  )}
                </div>
                <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Discount code */}
      {creator.discountCode && (
        <div>
          <SectionLabel>Discount code</SectionLabel>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl mt-3">
            <span className="text-sm font-mono font-medium text-gray-900 flex-1">{creator.discountCode}</span>
            <span className="text-xs text-gray-400">{creator.commissionPct}% commission</span>
            <button
              onClick={() => navigator.clipboard.writeText(creator.discountCode!)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LinksTab({ links }: { links: CreatorLink[] }) {
  if (links.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-400">No links yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div
          key={link.id}
          className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Link2 size={13} className="text-rose-400 flex-shrink-0" />
              <span className="text-sm font-medium text-rose-500">{process.env.NEXT_PUBLIC_SHORT_DOMAIN || "joinkool.co"}/{link.slug}</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`https://${process.env.NEXT_PUBLIC_SHORT_DOMAIN || "joinkool.co"}/${link.slug}`)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Copy size={13} />
            </button>
          </div>
          <p className="text-xs text-gray-400 truncate mb-3">{link.destination}</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              <span className="font-medium text-gray-900">{link.sales}</span> sales
            </span>
            <span className="text-xs text-gray-500">
              <span className="font-medium text-gray-900">{formatCurrency(link.revenue)}</span> revenue
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function EarningsTab({ creator }: { creator: Creator }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-base font-semibold text-amber-600">{formatCurrency(creator.pendingCommissions)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Approved</p>
          <p className="text-base font-semibold text-brand-600">{formatCurrency(creator.approvedCommissions)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Paid</p>
          <p className="text-base font-semibold text-gray-900">{formatCurrency(creator.paidCommissions)}</p>
        </div>
      </div>

      {creator.commissions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">No earnings yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {creator.commissions.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:border-gray-100 transition-colors"
            >
              <div>
                <p className="text-sm text-gray-900">{formatCurrency(c.orderAmount)} sale</p>
                <p className="text-xs text-gray-400">
                  {formatDate(c.createdAt)} · {c.percentage}% commission
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(c.amount)}</p>
                <span
                  className={`text-[10px] font-medium ${
                    c.status === "PAID"
                      ? "text-brand-500"
                      : c.status === "APPROVED"
                      ? "text-blue-500"
                      : c.status === "PENDING"
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                >
                  {c.status === "PAID"
                    ? "Paid"
                    : c.status === "APPROVED"
                    ? "Approved"
                    : c.status === "PENDING"
                    ? "Pending"
                    : "Rejected"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignsTab({ campaigns }: { campaigns: CampaignEntry[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-400">Not in any campaign yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {campaigns.map((cc) => (
        <a
          key={cc.campaign.id}
          href={`/dashboard/campaigns/${cc.campaign.id}`}
          className="block p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900">{cc.campaign.name}</p>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                cc.campaign.formStatus === "ACTIVE"
                  ? "bg-brand-50 text-brand-600"
                  : cc.campaign.formStatus === "PAUSED"
                  ? "bg-yellow-50 text-yellow-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {cc.campaign.formStatus === "ACTIVE"
                ? "Activa"
                : cc.campaign.formStatus === "PAUSED"
                ? "Pausada"
                : "Cerrada"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {cc.commissionPct != null && (
              <span className="text-xs text-gray-400">{cc.commissionPct}% commission</span>
            )}
            {cc.discountCode && (
              <span className="text-xs font-mono text-gray-400">{cc.discountCode}</span>
            )}
          </div>
        </a>
      ))}
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function MetricTile({
  icon, label, value, accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 ${accent ? "bg-brand-50" : "bg-gray-50"}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${accent ? "text-brand-400" : "text-gray-400"}`}>
        {icon}
        <span className={`text-[11px] uppercase tracking-wider ${accent ? "text-brand-500" : "text-gray-400"}`}>
          {label}
        </span>
      </div>
      <p className={`text-xl font-semibold ${accent ? "text-brand-700" : "text-gray-900"}`}>{value}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{children}</h3>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && <span className="text-gray-400 w-4 flex-shrink-0">{icon}</span>}
      <span className="text-xs text-gray-400 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}
