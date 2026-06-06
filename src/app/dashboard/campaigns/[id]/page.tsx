"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, MousePointerClick, ShoppingCart, DollarSign, TrendingUp,
  Users, Link2, X, RefreshCw, UserPlus, Trash2, RefreshCcw, Package,
  FileText, Plus, Paperclip, ExternalLink, Upload, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Copy, Check, Instagram, Search, Gift, Minus,
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

interface Application {
  id: string
  name: string
  email: string
  phone: string | null
  age: number | null
  city: string | null
  instagram: string | null
  tiktok: string | null
  status: "PENDING" | "ACCEPTED" | "REJECTED"
  notes: string | null
  createdAt: string
}

interface CampaignDetail {
  id: string
  name: string
  description: string | null
  status: "PRE_LAUNCH" | "RUNNING" | "COMPLETED"
  formStatus: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  slug: string | null
  workspaceId: string
  creators: CampaignCreator[]
  links: CampaignLink[]
  briefings: CampaignBriefing[]
  _count?: { applications: number }
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

interface SearchCreator {
  id: string
  name: string
  email: string
  instagram: string | null
  commissionPct: number
  alreadyInCampaign: boolean
}

interface TiendanubeVariant {
  id: number
  price: string
  sku: string | null
  stock: number | null
}

interface TiendanubeProduct {
  id: number
  name: { es: string } | string
  variants: TiendanubeVariant[]
  images: { src: string }[]
}

interface SelectedProduct {
  variantId: number
  productId: number
  name: string
  variantName: string
  price: number
  quantity: number
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  PRE_LAUNCH: { label: "Pre-launch", style: "bg-amber-100 text-amber-700" },
  RUNNING: { label: "Activa", style: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completada", style: "bg-gray-100 text-gray-500" },
}

const STATUS_ORDER: ("PRE_LAUNCH" | "RUNNING" | "COMPLETED")[] = ["PRE_LAUNCH", "RUNNING", "COMPLETED"]

type Tab = "overview" | "creators" | "links" | "gifting" | "briefings" | "applications"

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
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [applicationsFilter, setApplicationsFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "REJECTED">("ALL")

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

  const loadGifting = useCallback(() => {
    setGiftingLoading(true)
    fetch(`/api/gifting?campaignId=${id}`)
      .then((r) => r.json())
      .then((d) => setGiftingOrders(d.giftingOrders ?? []))
      .finally(() => setGiftingLoading(false))
  }, [id])

  useEffect(() => {
    if (tab !== "gifting" || giftingOrders.length > 0) return
    loadGifting()
  }, [tab, id, giftingOrders.length, loadGifting])

  const loadApplications = useCallback(() => {
    if (!campaign?.slug) return
    setApplicationsLoading(true)
    fetch(`/api/campaigns/${id}/applications`)
      .then((r) => r.json())
      .then((d) => setApplications(d.applications ?? []))
      .finally(() => setApplicationsLoading(false))
  }, [id, campaign?.slug])

  useEffect(() => {
    if (tab === "applications") loadApplications()
  }, [tab, loadApplications])

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
            ...(campaign.slug
              ? [{
                  key: "applications" as Tab,
                  label: `Aplicaciones${applications.filter((a) => a.status === "PENDING").length > 0 ? ` · ${applications.filter((a) => a.status === "PENDING").length} pendientes` : ""}`,
                }]
              : []),
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
        <GiftingTab
          orders={giftingOrders}
          loading={giftingLoading}
          campaign={campaign}
          onGiftingCreated={() => { setGiftingOrders([]); loadGifting() }}
        />
      )}

      {tab === "briefings" && (
        <BriefingsTab
          campaign={campaign}
          onCreateBriefing={() => setShowCreateBriefing(true)}
        />
      )}

      {tab === "applications" && campaign.slug && (
        <ApplicationsTab
          campaignId={campaign.id}
          applications={applications}
          loading={applicationsLoading}
          filter={applicationsFilter}
          onFilterChange={setApplicationsFilter}
          onRefresh={loadApplications}
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

function GiftingTab({ orders, loading, campaign, onGiftingCreated }: {
  orders: GiftingOrder[]
  loading: boolean
  campaign: CampaignDetail
  onGiftingCreated: () => void
}) {
  const [showCreate, setShowCreate] = useState(false)

  const total = orders.reduce((s, o) => s + o.totalValue, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">
          {loading ? "—" : `${orders.length} envío${orders.length !== 1 ? "s" : ""}`}
          {!loading && orders.length > 0 && (
            <span className="ml-2 text-gray-400">· Total: {formatCurrency(total)}</span>
          )}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Gift size={14} />
          Nuevo gifting
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={18} className="animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Package size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No hay gifting registrado en esta campaña.</p>
          <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-brand-600 hover:underline mt-2">
            Crear primer gifting
          </button>
        </div>
      ) : (
        <div className="space-y-3">
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
      )}

      {showCreate && (
        <CreateCampaignGiftingModal
          campaign={campaign}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); onGiftingCreated() }}
        />
      )}
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
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchCreator[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchCreator | null>(null)
  const [commissionPct, setCommissionPct] = useState("10")
  const [discountCode, setDiscountCode] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/creators/search?q=${encodeURIComponent(query)}&campaignId=${campaignId}`
        )
        const data = await res.json()
        setResults(data.creators ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, campaignId])

  const handleSelect = (creator: SearchCreator) => {
    setSelected(creator)
    setCommissionPct(creator.commissionPct.toString())
    setDiscountCode(generateDiscountCode(creator.name, creator.commissionPct))
  }

  const handleAdd = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorIds: [selected.id],
          commissionPct: parseFloat(commissionPct),
          discountCode: discountCode || undefined,
        }),
      })
      if (res.ok) {
        onAdded()
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Agregar creator a la campaña
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!selected ? (
            <div>
              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, email o @instagram..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {results.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => !creator.alreadyInCampaign && handleSelect(creator)}
                      disabled={creator.alreadyInCampaign || existingCreatorIds.includes(creator.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${
                        creator.alreadyInCampaign || existingCreatorIds.includes(creator.id)
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                        {creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{creator.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{creator.email}</span>
                          {creator.instagram && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Instagram size={10} />
                              {creator.instagram}
                            </span>
                          )}
                        </div>
                      </div>
                      {(creator.alreadyInCampaign || existingCreatorIds.includes(creator.id)) && (
                        <span className="text-xs text-gray-400 flex-shrink-0">Ya está</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-xs text-gray-400 mt-2 text-center py-3">
                  No se encontraron creators con &quot;{query}&quot;
                </p>
              )}

              {searching && (
                <div className="flex items-center justify-center mt-3">
                  <RefreshCw size={14} className="animate-spin text-gray-400" />
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  ¿No está en Kool?{" "}
                  <button
                    onClick={onClose}
                    className="text-brand-600 hover:underline"
                  >
                    Invitarlo desde Creators
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected creator preview */}
              <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold flex-shrink-0">
                  {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.email}</p>
                </div>
                <button
                  onClick={() => { setSelected(null); setQuery("") }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cambiar
                </button>
              </div>

              {/* Commission */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Comisión para esta campaña (%)
                </label>
                <input
                  type="number"
                  value={commissionPct}
                  onChange={(e) => {
                    setCommissionPct(e.target.value)
                    setDiscountCode(generateDiscountCode(selected.name, parseInt(e.target.value) || 10))
                  }}
                  min="1" max="50"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <p className="text-xs text-gray-400 mt-1">Esta comisión aplica solo para esta campaña.</p>
              </div>

              {/* Discount code */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Código de descuento
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button
                    type="button"
                    onClick={() => setDiscountCode(generateDiscountCode(selected.name, parseInt(commissionPct) || 10))}
                    title="Regenerar código"
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
                  >
                    <RefreshCcw size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Se crea automáticamente en Tiendanube.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          {selected && (
            <button
              onClick={handleAdd}
              disabled={submitting || !discountCode || !commissionPct}
              className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Agregando..." : "Agregar a la campaña"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CREATE CAMPAIGN GIFTING MODAL
// ─────────────────────────────────────────────

function productName(p: TiendanubeProduct): string {
  return typeof p.name === "object" ? p.name.es : p.name
}

function CreateCampaignGiftingModal({
  campaign,
  onClose,
  onCreated,
}: {
  campaign: CampaignDetail
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState<"creator" | "products" | "confirm">("creator")
  const [selectedCreators, setSelectedCreators] = useState<{ id: string; name: string; address: string | null; city: string | null }[]>([])
  const [products, setProducts] = useState<TiendanubeProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selected, setSelected] = useState<SelectedProduct[]>([])
  const [search, setSearch] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const campaignCreators = campaign.creators.map((cc) => ({
    id: cc.creator.id,
    name: cc.creator.name,
    address: null as string | null,
    city: null as string | null,
  }))

  const loadProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch(`/api/tiendanube/products?workspaceId=${campaign.workspaceId}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } finally {
      setProductsLoading(false)
    }
  }

  const goToProducts = () => {
    setStep("products")
    if (products.length === 0) loadProducts()
  }

  const addVariant = (product: TiendanubeProduct, variant: TiendanubeVariant) => {
    const existing = selected.find((s) => s.variantId === variant.id)
    if (existing) {
      setSelected((prev) => prev.map((s) => s.variantId === variant.id ? { ...s, quantity: s.quantity + 1 } : s))
    } else {
      const name = productName(product)
      const variantName = product.variants.length > 1 ? (variant.sku || `Variante ${variant.id}`) : ""
      setSelected((prev) => [...prev, {
        variantId: variant.id,
        productId: product.id,
        name,
        variantName,
        price: parseFloat(variant.price) || 0,
        quantity: 1,
      }])
    }
  }

  const updateQty = (variantId: number, delta: number) => {
    setSelected((prev) =>
      prev
        .map((s) => s.variantId === variantId ? { ...s, quantity: s.quantity + delta } : s)
        .filter((s) => s.quantity > 0)
    )
  }

  const filteredProducts = products.filter((p) =>
    productName(p).toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = selected.reduce((s, p) => s + p.price * p.quantity, 0)

  const handleSubmit = async () => {
    if (selectedCreators.length === 0 || selected.length === 0) return
    setSubmitting(true)
    setError("")
    try {
      const payload = selected.map((p) => ({
        variantId: p.variantId,
        productId: p.productId,
        name: p.variantName ? `${p.name} - ${p.variantName}` : p.name,
        quantity: p.quantity,
        value: p.price,
      }))

      const results = await Promise.all(
        selectedCreators.map((creator) =>
          fetch("/api/gifting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: campaign.workspaceId,
              creatorId: creator.id,
              campaignId: campaign.id,
              products: payload,
              notes: notes || undefined,
            }),
          }).then((r) => r.json())
        )
      )

      const failed = results.find((r) => r.error)
      if (failed) { setError(failed.error); return }
      onCreated()
    } catch {
      setError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleCreator = (c: typeof campaignCreators[0]) => {
    setSelectedCreators((prev) =>
      prev.some((s) => s.id === c.id) ? prev.filter((s) => s.id !== c.id) : [...prev, c]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nuevo gifting</h2>
            <div className="flex items-center gap-2 mt-1">
              {(["creator", "products", "confirm"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    step === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {i + 1}. {s === "creator" ? "Creator" : s === "products" ? "Productos" : "Confirmar"}
                  </span>
                  {i < 2 && <span className="text-gray-200 text-xs">›</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Select creators from campaign */}
        {step === "creator" && (
          <>
            <div className="flex-1 overflow-auto p-6">
              {campaignCreators.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Esta campaña no tiene creators todavía.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaignCreators.map((c) => {
                    const isSelected = selectedCreators.some((s) => s.id === c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCreator(c)}
                        className={`w-full flex items-center gap-3 p-3 border rounded-xl text-left transition-colors ${
                          isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                        }`}>
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                          {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[12px] text-gray-400">
                {selectedCreators.length > 0
                  ? `${selectedCreators.length} seleccionado${selectedCreators.length !== 1 ? "s" : ""}`
                  : ""}
              </p>
              <button
                onClick={goToProducts}
                disabled={selectedCreators.length === 0}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Elegir productos →
              </button>
            </div>
          </>
        )}

        {/* Step 2: Products */}
        {step === "products" && (
          <>
            <div className="flex-1 overflow-auto flex flex-col min-h-0">
              <div className="px-6 py-3 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
              </div>

              <div className="flex flex-1 min-h-0">
                <div className="flex-1 overflow-auto p-4 space-y-2">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw size={18} className="animate-spin text-gray-400" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No se encontraron productos.</p>
                  ) : (
                    filteredProducts.map((product) => (
                      <div key={product.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center gap-3 mb-2">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0].src} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-gray-400" />
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-900">{productName(product)}</p>
                        </div>
                        <div className="space-y-1.5 pl-13">
                          {product.variants.map((variant) => {
                            const inCart = selected.find((s) => s.variantId === variant.id)
                            return (
                              <div key={variant.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  {product.variants.length > 1 && (
                                    <span className="text-xs text-gray-500">{variant.sku || `Var. ${variant.id}`}</span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-1">${parseFloat(variant.price).toLocaleString("es-AR")}</span>
                                </div>
                                {inCart ? (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => updateQty(variant.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100">
                                      <Minus size={12} />
                                    </button>
                                    <span className="text-sm font-medium w-5 text-center">{inCart.quantity}</span>
                                    <button onClick={() => addVariant(product, variant)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100">
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addVariant(product, variant)}
                                    className="flex-shrink-0 text-[11px] font-medium text-gray-700 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-50"
                                  >
                                    + Agregar
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {selected.length > 0 && (
                  <div className="w-52 border-l border-gray-100 p-4 flex flex-col gap-2 overflow-auto">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Seleccionados</p>
                    {selected.map((p) => (
                      <div key={p.variantId} className="text-xs">
                        <p className="font-medium text-gray-800 leading-tight">{p.name}</p>
                        {p.variantName && <p className="text-gray-400">{p.variantName}</p>}
                        <p className="text-gray-500">{p.quantity}x ${p.price.toLocaleString("es-AR")}</p>
                      </div>
                    ))}
                    <div className="mt-auto pt-2 border-t border-gray-100">
                      <p className="text-[11px] text-gray-400">Valor total</p>
                      <p className="text-sm font-semibold text-gray-900">${totalValue.toLocaleString("es-AR")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setStep("creator")} className="text-sm text-gray-500 hover:text-gray-700">
                ← Volver
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={selected.length === 0}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Confirmar ({selected.reduce((s, p) => s + p.quantity, 0)} items) →
              </button>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                  {selectedCreators.length === 1 ? "Creator" : `${selectedCreators.length} Creators`}
                </p>
                {selectedCreators.map((c) => (
                  <p key={c.id} className="text-sm font-medium text-gray-900">{c.name}</p>
                ))}
              </div>

              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Productos</p>
                <div className="space-y-2">
                  {selected.map((p) => (
                    <div key={p.variantId} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {p.quantity}x {p.name}{p.variantName ? ` - ${p.variantName}` : ""}
                      </span>
                      <span className="text-gray-500 flex-shrink-0 ml-3">${(p.price * p.quantity).toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${totalValue.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Campaña</p>
                <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nota para el creator <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Esperamos que te encante el producto..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setStep("products")} className="text-sm text-gray-500 hover:text-gray-700">
                ← Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting
                  ? `Creando ${selectedCreators.length > 1 ? selectedCreators.length + " órdenes" : "orden"}...`
                  : `Crear gifting${selectedCreators.length > 1 ? ` (${selectedCreators.length} creators)` : ""}`}
              </button>
            </div>
          </>
        )}
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

// ─────────────────────────────────────────────
// APPLICATIONS TAB
// ─────────────────────────────────────────────

const APP_STATUS = {
  PENDING:  { label: "Pendiente",  style: "bg-amber-100 text-amber-700" },
  ACCEPTED: { label: "Aceptado",   style: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rechazado",  style: "bg-red-100 text-red-600" },
}

function ApplicationsTab({
  campaignId,
  applications,
  loading,
  filter,
  onFilterChange,
  onRefresh,
}: {
  campaignId: string
  applications: Application[]
  loading: boolean
  filter: "ALL" | "PENDING" | "ACCEPTED" | "REJECTED"
  onFilterChange: (f: "ALL" | "PENDING" | "ACCEPTED" | "REJECTED") => void
  onRefresh: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    type: "accept" | "reject"
    application: Application
  } | null>(null)

  const filtered = filter === "ALL" ? applications : applications.filter((a) => a.status === filter)

  const counts = {
    ALL:      applications.length,
    PENDING:  applications.filter((a) => a.status === "PENDING").length,
    ACCEPTED: applications.filter((a) => a.status === "ACCEPTED").length,
    REJECTED: applications.filter((a) => a.status === "REJECTED").length,
  }

  const handleDecision = async (
    applicationId: string,
    status: "ACCEPTED" | "REJECTED",
    notes?: string
  ) => {
    const res = await fetch(`/api/campaigns/${campaignId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    })
    if (res.ok) {
      onRefresh()
      setConfirmModal(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={18} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5">
        {(["ALL", "PENDING", "ACCEPTED", "REJECTED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f === "ALL" ? "Todos" : f === "PENDING" ? "Pendientes" : f === "ACCEPTED" ? "Aceptados" : "Rechazados"}
            <span className={`ml-1.5 text-[11px] ${filter === f ? "text-white/60" : "text-gray-400"}`}>
              {counts[f]}
            </span>
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Users size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            {filter === "ALL" ? "Todavía no hay aplicaciones." : `No hay aplicaciones ${filter === "PENDING" ? "pendientes" : filter === "ACCEPTED" ? "aceptadas" : "rechazadas"}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => {
            const isExpanded = expandedId === app.id
            const cfg = APP_STATUS[app.status]
            const initials = app.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{app.name}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${cfg.style}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                      <span>{app.email}</span>
                      {app.city && <span>{app.city}</span>}
                      {app.instagram && <span>@{app.instagram}</span>}
                      {app.tiktok && <span>TT: @{app.tiktok}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {app.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ type: "accept", application: app })}
                          className="flex items-center gap-1 text-[12px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <CheckCircle2 size={13} />
                          Aceptar
                        </button>
                        <button
                          onClick={() => setConfirmModal({ type: "reject", application: app })}
                          className="flex items-center gap-1 text-[12px] font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <XCircle size={13} />
                          Rechazar
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3 text-[13px]">
                      {app.phone && (
                        <div>
                          <span className="text-gray-400">Teléfono</span>
                          <p className="text-gray-700 font-medium">{app.phone}</p>
                        </div>
                      )}
                      {app.age && (
                        <div>
                          <span className="text-gray-400">Edad</span>
                          <p className="text-gray-700 font-medium">{app.age} años</p>
                        </div>
                      )}
                      {app.city && (
                        <div>
                          <span className="text-gray-400">Ciudad</span>
                          <p className="text-gray-700 font-medium">{app.city}</p>
                        </div>
                      )}
                      {app.instagram && (
                        <div>
                          <span className="text-gray-400">Instagram</span>
                          <a
                            href={`https://instagram.com/${app.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 font-medium hover:underline flex items-center gap-1"
                          >
                            @{app.instagram}
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                      {app.tiktok && (
                        <div>
                          <span className="text-gray-400">TikTok</span>
                          <a
                            href={`https://tiktok.com/@${app.tiktok}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 font-medium hover:underline flex items-center gap-1"
                          >
                            @{app.tiktok}
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Aplicó</span>
                        <p className="text-gray-700 font-medium">{formatDate(app.createdAt)}</p>
                      </div>
                    </div>
                    {app.notes && (
                      <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-[12px] text-gray-600">
                        <span className="font-medium text-gray-500">Notas: </span>{app.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmApplicationModal
          type={confirmModal.type}
          application={confirmModal.application}
          onClose={() => setConfirmModal(null)}
          onConfirm={(notes) =>
            handleDecision(
              confirmModal.application.id,
              confirmModal.type === "accept" ? "ACCEPTED" : "REJECTED",
              notes
            )
          }
        />
      )}
    </div>
  )
}

function ConfirmApplicationModal({
  type,
  application,
  onClose,
  onConfirm,
}: {
  type: "accept" | "reject"
  application: Application
  onClose: () => void
  onConfirm: (notes?: string) => void
}) {
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const isAccept = type === "accept"

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(notes || undefined)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isAccept ? "Aceptar aplicación" : "Rechazar aplicación"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-gray-600">
            {isAccept
              ? <>¿Aceptar a <strong>{application.name}</strong>? Se le enviará un email para unirse al programa.</>
              : <>¿Rechazar a <strong>{application.name}</strong>? Se le enviará un email notificando la decisión.</>
            }
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Notas internas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={isAccept ? "Motivo de aceptación, observaciones..." : "Motivo del rechazo..."}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                isAccept ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "..." : isAccept ? "Confirmar aceptación" : "Confirmar rechazo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
