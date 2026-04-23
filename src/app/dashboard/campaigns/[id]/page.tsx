"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, MousePointerClick, ShoppingCart, DollarSign, TrendingUp,
  Users, Link2, X, RefreshCw, UserPlus, Trash2, RefreshCcw, Package,
  FileText, Plus, Paperclip, ExternalLink, Upload,
} from "lucide-react"
import { formatNumber, formatCurrency, formatDate, generateDiscountCode } from "@/lib/utils"

interface CampaignCreator {
  id: string
  commissionPct: number | null
  discountCode: string | null
  status: string
  creator: {
    id: string
    name: string
    email: string
    instagram: string | null
    discountCode: string | null
    commissionPct: number
    status: string
  }
}

interface CampaignLink {
  id: string
  slug: string
  destination: string
  discountCode: string | null
  creator: { name: string } | null
}

interface BriefingAsset {
  name: string
  url: string
  type: string
}

interface CampaignBriefing {
  id: string
  subject: string
  body: string
  status: string
  sentAt: string | null
  createdAt: string
  assets: BriefingAsset[] | null
  _count: { recipients: number }
}

interface CampaignDetail {
  id: string
  name: string
  description: string | null
  status: "PRE_LAUNCH" | "RUNNING" | "COMPLETED"
  startDate: string | null
  endDate: string | null
  budget: number | null
  workspaceId: string
  creators: CampaignCreator[]
  links: CampaignLink[]
  briefings: CampaignBriefing[]
}

interface GiftingOrder {
  id: string
  totalValue: number
  status: string
  notes: string | null
  createdAt: string
  products: { name: string; quantity: number }[]
  creator: { id: string; name: string; email: string }
}

interface Analytics {
  clicks: number
  conversions: number
  revenue: number
  commissions: number
}

interface AvailableCreator {
  id: string
  name: string
  email: string
  instagram: string | null
  discountCode: string | null
  commissionPct: number
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  PRE_LAUNCH: { label: "Pre-launch", style: "bg-amber-100 text-amber-700" },
  RUNNING: { label: "Activa", style: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completada", style: "bg-gray-100 text-gray-500" },
}

const STATUS_ORDER: ("PRE_LAUNCH" | "RUNNING" | "COMPLETED")[] = ["PRE_LAUNCH", "RUNNING", "COMPLETED"]

type Tab = "overview" | "creators" | "links" | "gifting" | "briefings"

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")
  const [showAddCreators, setShowAddCreators] = useState(false)
  const [showCreateBriefing, setShowCreateBriefing] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [giftingOrders, setGiftingOrders] = useState<GiftingOrder[]>([])
  const [giftingLoading, setGiftingLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setCampaign(data.campaign)
      setAnalytics(data.analytics)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (tab !== "gifting" || giftingOrders.length > 0) return
    setGiftingLoading(true)
    fetch(`/api/gifting?campaignId=${id}`)
      .then((r) => r.json())
      .then((d) => setGiftingOrders(d.giftingOrders ?? []))
      .finally(() => setGiftingLoading(false))
  }, [tab, id, giftingOrders.length])

  const updateStatus = async (status: string) => {
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const data = await res.json()
        setCampaign((c) => c ? { ...c, status: data.campaign.status } : c)
      }
    } finally {
      setStatusUpdating(false)
    }
  }

  const removeCreator = async (creatorId: string) => {
    await fetch(`/api/campaigns/${id}/creators?creatorId=${creatorId}`, { method: "DELETE" })
    loadData()
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!campaign || !analytics) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-500">Campaña no encontrada.</p>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[campaign.status]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/campaigns")}
          className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Campañas
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>
                {cfg.label}
              </span>
            </div>
            {campaign.description && (
              <p className="text-[13px] text-gray-400 mt-1">{campaign.description}</p>
            )}
            {(campaign.startDate || campaign.endDate) && (
              <p className="text-[12px] text-gray-400 mt-2">
                {campaign.startDate ? formatDate(campaign.startDate) : "—"}
                {" → "}
                {campaign.endDate ? formatDate(campaign.endDate) : "—"}
              </p>
            )}
          </div>

          {/* Status controls */}
          <div className="flex items-center gap-2">
            {STATUS_ORDER.map((s) => {
              const c = STATUS_CONFIG[s]
              const isActive = campaign.status === s
              return (
                <button
                  key={s}
                  disabled={statusUpdating || isActive}
                  onClick={() => updateStatus(s)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? `${c.style} cursor-default`
                      : "text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-600"
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard icon={MousePointerClick} label="Clics" value={formatNumber(analytics.clicks)} />
        <MetricCard icon={ShoppingCart} label="Conversiones" value={analytics.conversions.toString()} />
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(analytics.revenue)} />
        <MetricCard icon={DollarSign} label="Comisiones" value={formatCurrency(analytics.commissions)} accent />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 mb-6">
        <div className="flex gap-6">
          {([
            { key: "overview" as Tab, label: "Overview" },
            { key: "creators" as Tab, label: `Creators (${campaign.creators.length})` },
            { key: "links" as Tab, label: `Links (${campaign.links.length})` },
            { key: "gifting" as Tab, label: `Gifting (${giftingOrders.length})` },
            { key: "briefings" as Tab, label: `Briefings (${campaign.briefings.length})` },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-[13px] font-medium transition-colors border-b-2 ${
                tab === t.key
                  ? "text-gray-900 border-gray-900"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab campaign={campaign} analytics={analytics} />
      )}

      {tab === "creators" && (
        <CreatorsTab
          campaign={campaign}
          onAdd={() => setShowAddCreators(true)}
          onRemove={removeCreator}
        />
      )}

      {tab === "links" && (
        <LinksTab campaign={campaign} />
      )}

      {tab === "gifting" && (
        <GiftingTab orders={giftingOrders} loading={giftingLoading} />
      )}

      {tab === "briefings" && (
        <BriefingsTab
          campaign={campaign}
          onCreateBriefing={() => setShowCreateBriefing(true)}
        />
      )}

      {showAddCreators && (
        <AddCreatorsModal
          campaignId={campaign.id}
          workspaceId={campaign.workspaceId}
          existingCreatorIds={campaign.creators.map((cc) => cc.creator.id)}
          onClose={() => setShowAddCreators(false)}
          onAdded={loadData}
        />
      )}

      {showCreateBriefing && (
        <CreateBriefingModal
          campaign={campaign}
          onClose={() => setShowCreateBriefing(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={accent ? "text-brand-500" : "text-gray-400"} />
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-semibold tracking-tight ${accent ? "text-brand-500" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  )
}

function OverviewTab({ campaign, analytics }: { campaign: CampaignDetail; analytics: Analytics }) {
  const convRate = analytics.clicks > 0
    ? ((analytics.conversions / analytics.clicks) * 100).toFixed(1)
    : "0"

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Resumen</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Creators</span>
              <span className="font-medium text-gray-900">{campaign.creators.length}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Links activos</span>
              <span className="font-medium text-gray-900">{campaign.links.length}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Briefings enviados</span>
              <span className="font-medium text-gray-900">
                {campaign.briefings.filter((b) => b.status === "SENT").length}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Tasa de conversión</span>
              <span className="font-medium text-gray-900">{convRate}%</span>
            </div>
          </div>
        </div>

        {campaign.budget && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Presupuesto</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">Asignado</span>
                <span className="font-medium text-gray-900">{formatCurrency(campaign.budget)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">Comisiones generadas</span>
                <span className="font-medium text-gray-900">{formatCurrency(analytics.commissions)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">Disponible</span>
                <span className="font-medium text-brand-500">
                  {formatCurrency(Math.max(0, campaign.budget - analytics.commissions))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Briefings */}
      {campaign.briefings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Briefings</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {campaign.briefings.map((b) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center justify-between">
                <span className="text-[13px] text-gray-700">{b.subject}</span>
                <div className="flex items-center gap-2">
                  {b.sentAt && (
                    <span className="text-[11px] text-gray-400">{formatDate(b.sentAt)}</span>
                  )}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    b.status === "SENT" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {b.status === "SENT" ? "Enviado" : b.status === "DRAFT" ? "Borrador" : b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreatorsTab({ campaign, onAdd, onRemove }: {
  campaign: CampaignDetail
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">
          {campaign.creators.length} creator{campaign.creators.length !== 1 ? "s" : ""} en esta campaña
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <UserPlus size={14} />
          Agregar creators
        </button>
      </div>

      {campaign.creators.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Users size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-3">No hay creators en esta campaña.</p>
          <button onClick={onAdd} className="text-sm font-medium text-brand-600 hover:underline">
            Agregar creators
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Creator</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Código</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Comisión</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaign.creators.map((cc) => (
                <tr key={cc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold">
                        {cc.creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cc.creator.name}</p>
                        <p className="text-xs text-gray-400">{cc.creator.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {cc.discountCode || cc.creator.discountCode || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {cc.commissionPct ?? cc.creator.commissionPct}%
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onRemove(cc.creator.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Quitar de la campaña"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LinksTab({ campaign }: { campaign: CampaignDetail }) {
  return (
    <div>
      <p className="text-[13px] text-gray-500 mb-4">
        {campaign.links.length} link{campaign.links.length !== 1 ? "s" : ""} en esta campaña
      </p>

      {campaign.links.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Link2 size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Creá links desde la sección Links y asignalos a esta campaña.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Link</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Creator</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Código</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaign.links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">kool.link/{link.slug}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[250px]">{link.destination}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {link.creator?.name ?? "—"}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface CreatorConfig {
  commissionPct: string
  discountCode: string
}

const GIFTING_STATUS: Record<string, { label: string; style: string }> = {
  PENDING:    { label: "Pendiente",  style: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "Procesando", style: "bg-blue-100 text-blue-700" },
  SENT:       { label: "Enviado",    style: "bg-purple-100 text-purple-700" },
  DELIVERED:  { label: "Entregado",  style: "bg-brand-100 text-brand-700" },
  CONFIRMED:  { label: "Confirmado", style: "bg-green-100 text-green-700" },
  CANCELLED:  { label: "Cancelado",  style: "bg-red-100 text-red-600" },
}

function GiftingTab({ orders, loading }: { orders: GiftingOrder[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={18} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <Package size={28} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No hay gifting registrado en esta campaña.</p>
        <p className="text-xs text-gray-400 mt-1">Al crear un gifting podés asignarlo a esta campaña.</p>
      </div>
    )
  }

  const total = orders.reduce((s, o) => s + o.totalValue, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] text-gray-500">{orders.length} envío{orders.length !== 1 ? "s" : ""}</p>
        <p className="text-[13px] font-medium text-gray-700">Total: {formatCurrency(total)}</p>
      </div>
      {orders.map((order) => {
        const cfg = GIFTING_STATUS[order.status] ?? GIFTING_STATUS.PENDING
        const products = Array.isArray(order.products)
          ? (order.products as { name: string; quantity: number }[])
          : []
        return (
          <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <Package size={15} className="text-brand-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{order.creator.name}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {products.map((p) => `${p.quantity}x ${p.name}`).join(" · ")}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.totalValue)}</p>
              <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("es-AR")}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AddCreatorsModal({ campaignId, workspaceId, existingCreatorIds, onClose, onAdded }: {
  campaignId: string
  workspaceId: string
  existingCreatorIds: string[]
  onClose: () => void
  onAdded: () => void
}) {
  const [available, setAvailable] = useState<AvailableCreator[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [configs, setConfigs] = useState<Record<string, CreatorConfig>>({})
  const [step, setStep] = useState<"select" | "configure">("select")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/creators?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.creators as AvailableCreator[]).filter(
          (c) => !existingCreatorIds.includes(c.id)
        )
        setAvailable(filtered)
      })
      .finally(() => setLoading(false))
  }, [workspaceId, existingCreatorIds])

  const toggle = (creator: AvailableCreator) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(creator.id)) {
        next.delete(creator.id)
      } else {
        next.add(creator.id)
        // Pre-fill config with auto-generated code
        setConfigs((c) => ({
          ...c,
          [creator.id]: {
            commissionPct: creator.commissionPct.toString(),
            discountCode: generateDiscountCode(creator.name, creator.commissionPct),
          },
        }))
      }
      return next
    })
  }

  const updateConfig = (creatorId: string, field: keyof CreatorConfig, value: string) => {
    setConfigs((c) => ({ ...c, [creatorId]: { ...c[creatorId], [field]: value } }))
  }

  const regenerateCode = (creator: AvailableCreator) => {
    const pct = parseInt(configs[creator.id]?.commissionPct) || creator.commissionPct
    const code = generateDiscountCode(creator.name, pct)
    updateConfig(creator.id, "discountCode", code)
  }

  const handleNext = () => {
    if (!selected.size) return
    setStep("configure")
  }

  const handleAdd = async () => {
    setSubmitting(true)
    try {
      const results = await Promise.all(
        Array.from(selected).map((creatorId) => {
          const cfg = configs[creatorId]
          return fetch(`/api/campaigns/${campaignId}/creators`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creatorIds: [creatorId],
              commissionPct: cfg ? parseFloat(cfg.commissionPct) : undefined,
              discountCode: cfg?.discountCode || undefined,
            }),
          })
        })
      )
      if (results.every((r) => r.ok)) {
        onAdded()
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCreators = available.filter((c) => selected.has(c.id))

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === "select" ? "Agregar creators" : "Asignar códigos"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === "select"
                ? "Seleccioná los creators para esta campaña."
                : "Revisá el código y comisión de cada creator en esta campaña."}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {step === "select" ? (
            loading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw size={18} className="animate-spin text-gray-400" />
              </div>
            ) : available.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400">Todos tus creators ya están en esta campaña.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {available.map((c) => {
                  const isSelected = selected.has(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        isSelected ? "bg-brand-50 border border-brand-200" : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-brand-400 border-brand-400" : "border-gray-300"
                      }`}>
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                      <span className="text-[11px] text-gray-400">{c.commissionPct}%</span>
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {selectedCreators.map((c) => {
                const cfg = configs[c.id] ?? { commissionPct: c.commissionPct.toString(), discountCode: "" }
                return (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Comisión %</label>
                        <input
                          type="number"
                          value={cfg.commissionPct}
                          onChange={(e) => updateConfig(c.id, "commissionPct", e.target.value)}
                          min="1" max="50"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Código de descuento</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={cfg.discountCode}
                            onChange={(e) => updateConfig(c.id, "discountCode", e.target.value.toUpperCase())}
                            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                          />
                          <button
                            type="button"
                            onClick={() => regenerateCode(c)}
                            title="Regenerar código"
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
                          >
                            <RefreshCcw size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          {step === "select" ? (
            <>
              <p className="text-[12px] text-gray-400">{selected.size} seleccionados</p>
              <button
                onClick={handleNext}
                disabled={!selected.size}
                className="px-5 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                Continuar →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("select")}
                className="text-[13px] text-gray-500 hover:text-gray-700"
              >
                ← Volver
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="px-5 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Agregando..." : `Agregar ${selected.size} creator${selected.size !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BRIEFINGS TAB
// ─────────────────────────────────────────────

function BriefingsTab({
  campaign,
  onCreateBriefing,
}: {
  campaign: CampaignDetail
  onCreateBriefing: () => void
}) {
  const briefings = campaign.briefings

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">
          {briefings.length} briefing{briefings.length !== 1 ? "s" : ""} en esta campaña
        </p>
        <button
          onClick={onCreateBriefing}
          className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} />
          Crear briefing
        </button>
      </div>

      {briefings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <FileText size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-3">No hay briefings en esta campaña.</p>
          <button onClick={onCreateBriefing} className="text-sm font-medium text-brand-600 hover:underline">
            Crear primer briefing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {briefings.map((b) => {
            const assets = b.assets ?? []
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-[15px] font-semibold text-gray-900 truncate">{b.subject}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        b.status === "SENT" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {b.status === "SENT" ? "Enviado" : b.status === "DRAFT" ? "Borrador" : b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-gray-400 mt-1">
                      <span>{b._count.recipients} destinatario{b._count.recipients !== 1 ? "s" : ""}</span>
                      {b.sentAt && <span>Enviado {formatDate(b.sentAt)}</span>}
                      {!b.sentAt && b.createdAt && <span>Creado {formatDate(b.createdAt)}</span>}
                    </div>
                    {assets.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {assets.map((asset, i) => (
                          <a
                            key={i}
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Paperclip size={10} />
                            {asset.name}
                            <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// CREATE BRIEFING MODAL
// ─────────────────────────────────────────────

function CreateBriefingModal({
  campaign,
  onClose,
  onCreated,
}: {
  campaign: CampaignDetail
  onClose: () => void
  onCreated: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendIntentRef = useRef(false)
  const [form, setForm] = useState({ subject: "", body: "" })
  const [assets, setAssets] = useState<{ name: string; url: string; type: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al subir el archivo")
        return
      }
      setAssets((prev) => [...prev, { name: data.name, url: data.url, type: data.type }])
    } catch {
      setError("Error de conexión al subir el archivo")
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeAsset = (index: number) => {
    setAssets((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    const shouldSend = sendIntentRef.current

    try {
      const creatorIds = campaign.creators.map((cc) => cc.creator.id)
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: campaign.workspaceId,
          campaignId: campaign.id,
          campaignName: campaign.name,
          subject: form.subject,
          body: form.body,
          creatorIds,
          assets,
          send: shouldSend,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear el briefing")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  const creatorCount = campaign.creators.length

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Crear briefing</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Se enviará a los {creatorCount} creator{creatorCount !== 1 ? "s" : ""} de la campaña.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <form id="briefing-form" onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Asunto *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Ej: Briefing verano 2026 — instrucciones de contenido"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Contenido *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Describí los lineamientos de la campaña, qué comunicar, fechas, etc."
              required
              rows={6}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Documentos adjuntos</label>
            <div className="space-y-2">
              {assets.map((asset, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="text-[13px] text-gray-700 truncate">{asset.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAsset(i)}
                    className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 w-full border border-dashed border-gray-200 rounded-lg px-3 py-2.5 text-[13px] text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                {uploading ? "Subiendo..." : "Adjuntar PDF u otro documento"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[11px] text-gray-400">PDF, Word o imagen · Máx 10MB</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          {creatorCount === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
              Esta campaña no tiene creators. Agregá creators antes de enviar el briefing.
            </p>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          <div className="flex gap-2">
            <button
              type="submit"
              form="briefing-form"
              disabled={submitting || !form.subject || !form.body}
              onClick={() => { sendIntentRef.current = false }}
              className="px-4 py-2 text-[13px] text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Guardar borrador"}
            </button>
            <button
              type="submit"
              form="briefing-form"
              disabled={submitting || !form.subject || !form.body || creatorCount === 0}
              onClick={() => { sendIntentRef.current = true }}
              className="px-4 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Enviando..." : `Enviar a ${creatorCount} creator${creatorCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
