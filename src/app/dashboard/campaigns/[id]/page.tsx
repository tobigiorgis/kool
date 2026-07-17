"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  Link2,
  X,
  RefreshCw,
  UserPlus,
  Trash2,
  RefreshCcw,
  Package,
  FileText,
  Plus,
  Paperclip,
  ExternalLink,
  Upload,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Instagram,
  Search,
  Gift,
  Minus,
  BarChart2,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { formatNumber, formatCurrency, formatDate, generateDiscountCode } from "@/lib/utils"
import { buildShortUrl, shortUrlLabel } from "@/lib/links"
import BountiesTab from "./BountiesTab"

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
  creatorId?: string | null
  creator: { name: string } | null
  clicks?: number
  sales?: number
  revenue?: number
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

interface ApplicationAnswer {
  id: string
  answer: string
  question: { question: string; order: number }
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
  answers?: ApplicationAnswer[]
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

const STATUS_ORDER: ("PRE_LAUNCH" | "RUNNING" | "COMPLETED")[] = [
  "PRE_LAUNCH",
  "RUNNING",
  "COMPLETED",
]

type Tab =
  | "overview"
  | "creators"
  | "links"
  | "gifting"
  | "bounties"
  | "briefings"
  | "applications"
  | "analytics"

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
  const [applicationsFilter, setApplicationsFilter] = useState<
    "ALL" | "PENDING" | "ACCEPTED" | "REJECTED"
  >("ALL")

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

  useEffect(() => {
    loadData()
  }, [loadData])

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

  // Also load gifting for overview
  useEffect(() => {
    if (tab === "overview" && giftingOrders.length === 0) loadGifting()
  }, [tab, giftingOrders.length, loadGifting])

  const loadApplications = useCallback(() => {
    if (!campaign?.slug) return
    setApplicationsLoading(true)
    fetch(`/api/campaigns/${id}/applications`)
      .then((r) => r.json())
      .then((d) => setApplications(d.applications ?? []))
      .finally(() => setApplicationsLoading(false))
  }, [id, campaign?.slug])

  useEffect(() => {
    if (tab === "applications" || tab === "overview") loadApplications()
  }, [tab, loadApplications])

  const handleAcceptApplication = useCallback(
    async (applicationId: string) => {
      await fetch(`/api/campaigns/${id}/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED" }),
      })
      loadApplications()
    },
    [id, loadApplications]
  )

  const handleRejectApplication = useCallback(
    async (applicationId: string) => {
      await fetch(`/api/campaigns/${id}/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      })
      loadApplications()
    },
    [id, loadApplications]
  )

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
        setCampaign((c) => (c ? { ...c, status: data.campaign.status } : c))
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
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!campaign || !analytics) {
    return (
      <div className="p-4 lg:p-8 text-center">
        <p className="text-sm text-gray-500">Campaña no encontrada.</p>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[campaign.status]

  return (
    <div className="p-4 lg:p-8">
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
        <MetricCard
          icon={ShoppingCart}
          label="Conversiones"
          value={analytics.conversions.toString()}
        />
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(analytics.revenue)} />
        <MetricCard
          icon={DollarSign}
          label="Comisiones"
          value={formatCurrency(analytics.commissions)}
          accent
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 mb-6">
        <div className="flex gap-6">
          {[
            { key: "overview" as Tab, label: "Overview" },
            { key: "creators" as Tab, label: `Creators (${campaign.creators.length})` },
            { key: "links" as Tab, label: `Links (${campaign.links.length})` },
            { key: "gifting" as Tab, label: `Gifting (${giftingOrders.length})` },
            { key: "bounties" as Tab, label: "Bounties" },
            { key: "briefings" as Tab, label: `Briefings (${campaign.briefings.length})` },
            ...(campaign.slug
              ? [
                  {
                    key: "applications" as Tab,
                    label: `Aplicaciones${applications.filter((a) => a.status === "PENDING").length > 0 ? ` · ${applications.filter((a) => a.status === "PENDING").length} pendientes` : ""}`,
                  },
                ]
              : []),
            { key: "analytics" as Tab, label: "Analytics" },
          ].map((t) => (
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
        <OverviewTab
          campaign={campaign}
          analytics={analytics}
          creators={campaign.creators}
          briefings={campaign.briefings}
          giftingOrders={giftingOrders}
          applications={applications}
          onNavigate={setTab}
          onAcceptApplication={handleAcceptApplication}
          onRejectApplication={handleRejectApplication}
        />
      )}

      {tab === "creators" && (
        <CreatorsTab
          campaign={campaign}
          links={campaign.links}
          onAdd={() => setShowAddCreators(true)}
          onRemove={removeCreator}
          onRefresh={loadData}
        />
      )}

      {tab === "links" && <LinksTab links={campaign.links} campaignId={campaign.id} />}

      {tab === "gifting" && (
        <GiftingTab
          orders={giftingOrders}
          loading={giftingLoading}
          campaign={campaign}
          onGiftingCreated={() => {
            setGiftingOrders([])
            loadGifting()
          }}
        />
      )}

      {tab === "bounties" && <BountiesTab campaignId={campaign.id} />}

      {tab === "briefings" && (
        <BriefingsTab campaign={campaign} onCreateBriefing={() => setShowCreateBriefing(true)} />
      )}

      {tab === "analytics" && <CampaignAnalyticsTab campaign={campaign} analytics={analytics} />}

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

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={accent ? "text-brand-500" : "text-gray-400"} />
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`text-2xl font-semibold tracking-tight ${accent ? "text-brand-500" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  )
}

function OverviewTab({
  campaign,
  analytics,
  creators,
  briefings,
  giftingOrders,
  applications,
  onNavigate,
  onAcceptApplication,
  onRejectApplication,
}: {
  campaign: CampaignDetail
  analytics: Analytics
  creators: CampaignCreator[]
  briefings: CampaignBriefing[]
  giftingOrders: GiftingOrder[]
  applications: Application[]
  onNavigate: (tab: Tab) => void
  onAcceptApplication: (id: string) => void
  onRejectApplication: (id: string) => void
}) {
  const [chartPeriod, setChartPeriod] = useState<"1d" | "7d" | "30d">("7d")
  const [chartData, setChartData] = useState<{ date: string; clicks: number; sales: number }[]>([])
  const [chartLoading, setChartLoading] = useState(true)

  useEffect(() => {
    setChartLoading(true)
    fetch(`/api/campaigns/${campaign.id}/analytics/chart?period=${chartPeriod}`)
      .then((r) => r.json())
      .then((d) => setChartData(d.chartData || []))
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false))
  }, [chartPeriod, campaign.id])

  const pendingApplications = applications.filter((a) => a.status === "PENDING")
  const latestBriefing = briefings[0] ?? null
  const latestGifting = giftingOrders[0] ?? null

  // Build per-creator revenue from links
  const creatorsWithMetrics = creators.map((cc) => {
    const creatorLinks = campaign.links.filter((l) => l.creatorId === cc.creator.id)
    const totalRevenue = creatorLinks.reduce((s, l) => s + (l.revenue ?? 0), 0)
    const totalSales = creatorLinks.reduce((s, l) => s + (l.sales ?? 0), 0)
    return { ...cc, totalRevenue, totalSales }
  })
  const topCreators = [...creatorsWithMetrics]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 3)

  const formatAxisDate = (v: string) => {
    const d = new Date(v)
    return chartPeriod === "1d"
      ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Chart + Top creators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Performance</h3>
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-xs">
              {(["1d", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    chartPeriod === p
                      ? "bg-white shadow-sm text-gray-900 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {p === "1d" ? "Hoy" : p === "7d" ? "7 días" : "30 días"}
                </button>
              ))}
            </div>
          </div>

          {/* Inline metrics */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-xs text-gray-500">Clicks</span>
              <span className="text-sm font-semibold text-gray-900">
                {(analytics.clicks || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-400" />
              <span className="text-xs text-gray-500">Ventas</span>
              <span className="text-sm font-semibold text-gray-900">
                {(analytics.conversions || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="h-48">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB7185" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#FB7185" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB7185" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#FB7185" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickFormatter={formatAxisDate}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #f3f4f6",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                    labelFormatter={formatAxisDate}
                    formatter={(v: number, name: string) => [
                      v.toLocaleString(),
                      name === "clicks" ? "Clicks" : "Ventas",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#FB7185"
                    strokeWidth={1.5}
                    fill="url(#clicksGrad)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#FB7185"
                    strokeWidth={1.5}
                    fill="url(#salesGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top 3 creators */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Top creators</h3>
            <button
              onClick={() => onNavigate("creators")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Ver todos →
            </button>
          </div>

          {topCreators.length > 0 ? (
            <div className="space-y-3">
              {topCreators.map((cc, i) => {
                const initials = cc.creator.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                return (
                  <div key={cc.id} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-300 w-4 shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-rose-400">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {cc.creator.name}
                      </p>
                      <p className="text-xs text-gray-400">{cc.totalSales} ventas</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatCurrency(cc.totalRevenue)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-400">Sin datos todavía</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Last briefing + Last gifting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last briefing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Último briefing</h3>
            <button
              onClick={() => onNavigate("briefings")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Ver todos →
            </button>
          </div>

          {latestBriefing ? (
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText size={14} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {latestBriefing.subject}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        latestBriefing.status === "SENT"
                          ? "bg-brand-50 text-brand-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {latestBriefing.status === "SENT" ? "Enviado" : "Borrador"}
                    </span>
                    {latestBriefing.sentAt && (
                      <span className="text-xs text-gray-400">
                        {formatDate(latestBriefing.sentAt)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {latestBriefing._count.recipients} destinatarios
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-400 mb-2">Sin briefings todavía</p>
              <button
                onClick={() => onNavigate("briefings")}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Crear briefing →
              </button>
            </div>
          )}
        </div>

        {/* Last gifting */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Último gifting</h3>
            <button
              onClick={() => onNavigate("gifting")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Ver todos →
            </button>
          </div>

          {latestGifting ? (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                <Gift size={14} className="text-brand-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{latestGifting.creator?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {(latestGifting.products as { name: string; quantity: number }[])
                    ?.map((p) => p.name)
                    .join(", ")}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      latestGifting.status === "CONFIRMED"
                        ? "bg-brand-50 text-brand-600"
                        : latestGifting.status === "SENT"
                          ? "bg-purple-50 text-purple-600"
                          : latestGifting.status === "PROCESSING"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {latestGifting.status === "CONFIRMED"
                      ? "Confirmado"
                      : latestGifting.status === "SENT"
                        ? "Enviado"
                        : latestGifting.status === "PROCESSING"
                          ? "Procesando"
                          : "Pendiente"}
                  </span>
                  <span className="text-xs text-gray-900 font-medium">
                    {formatCurrency(latestGifting.totalValue || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-400 mb-2">Sin giftings todavía</p>
              <button
                onClick={() => onNavigate("gifting")}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Crear gifting →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Pending applications */}
      {campaign.slug && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Aplicaciones pendientes</h3>
              {pendingApplications.length > 0 && (
                <span className="text-[10px] font-semibold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                  {pendingApplications.length}
                </span>
              )}
            </div>
            {applications.length > 0 && (
              <button
                onClick={() => onNavigate("applications")}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Ver todas →
              </button>
            )}
          </div>

          {pendingApplications.length > 0 ? (
            <div className="space-y-2">
              {pendingApplications.slice(0, 3).map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:border-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-rose-400">
                        {app.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{app.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{app.email}</span>
                        {app.instagram && (
                          <span className="text-xs text-gray-400">@{app.instagram}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onRejectApplication(app.id)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      title="Rechazar"
                    >
                      <X size={12} />
                    </button>
                    <button
                      onClick={() => onAcceptApplication(app.id)}
                      className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white hover:bg-brand-600 transition-colors"
                      title="Aceptar"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-400">No hay aplicaciones pendientes de revisión.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CreatorRow({
  cc,
  campaignId,
  links,
  onRemove,
  onUpdated,
}: {
  cc: CampaignCreator
  campaignId: string
  links: CampaignLink[]
  onRemove: (id: string) => void
  onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [commission, setCommission] = useState(cc.commissionPct?.toString() ?? "")
  const [discount, setDiscount] = useState(cc.discountCode ?? "")
  const [saving, setSaving] = useState(false)
  const [creatingLink, setCreatingLink] = useState(false)

  const creatorLink = links.find((l) => l.creatorId === cc.creator.id)
  const hasLink = !!creatorLink

  const save = async () => {
    setSaving(true)
    await fetch(`/api/campaigns/${campaignId}/creators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId: cc.creator.id,
        commissionPct: commission !== "" ? parseFloat(commission) : null,
        discountCode: discount || null,
      }),
    })
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  const createLink = async () => {
    setCreatingLink(true)
    await fetch(`/api/tiendanube/generate-links`, { method: "POST" })
    setCreatingLink(false)
    onUpdated()
  }

  const displayCommission = cc.commissionPct != null ? `${cc.commissionPct}%` : "—"
  const displayDiscount = cc.discountCode || cc.creator.discountCode || "—"

  return (
    <>
      <tr className="hover:bg-gray-50">
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
            {displayDiscount}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-700">{displayCommission}</td>
        <td className="px-6 py-4">
          {hasLink ? (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit">
              <Check size={11} /> Creado
            </span>
          ) : (
            <button
              onClick={createLink}
              disabled={creatingLink}
              className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Link2 size={11} />
              {creatingLink ? "Creando..." : "Crear link"}
            </button>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => setEditing(!editing)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar condiciones"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={() => onRemove(cc.creator.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Quitar de la campaña"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="bg-gray-50 border-t border-gray-100">
          <td colSpan={4} className="px-6 py-4">
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Comisión (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="Sin comisión"
                  className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Código de descuento</label>
                <input
                  type="text"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value.toUpperCase())}
                  placeholder="Sin código"
                  className="w-40 text-sm font-mono border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-[13px] text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CreatorsTab({
  campaign,
  links,
  onAdd,
  onRemove,
  onRefresh,
}: {
  campaign: CampaignDetail
  links: CampaignLink[]
  onAdd: () => void
  onRemove: (id: string) => void
  onRefresh: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">
          {campaign.creators.length} creator{campaign.creators.length !== 1 ? "s" : ""} en esta
          campaña
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Link</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaign.creators.map((cc) => (
                <CreatorRow
                  key={cc.id}
                  cc={cc}
                  campaignId={campaign.id}
                  links={links}
                  onRemove={onRemove}
                  onUpdated={onRefresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LinksTab({ links, campaignId }: { links: CampaignLink[]; campaignId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">
          {links.length} link{links.length !== 1 ? "s" : ""} en esta campaña
        </p>
        <a
          href={`/dashboard/analytics?campaignId=${campaignId}`}
          className="text-[12px] text-brand-600 hover:text-brand-700 transition-colors"
        >
          Ver analytics de la campaña →
        </a>
      </div>

      {links.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Link2 size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Creá links desde la sección Links y asignalos a esta campaña.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Link
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Creator
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Código
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Sales
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link2 size={13} className="text-rose-400 flex-shrink-0" />
                      <span className="text-[13px] font-medium text-rose-500">
                        {shortUrlLabel(link.slug)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-[220px] mt-0.5 ml-5">
                      {link.destination}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">
                    {link.creator?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {link.discountCode ? (
                      <span className="font-mono text-xs bg-gray-50 text-gray-700 px-2 py-0.5 rounded">
                        {link.discountCode}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[13px] text-gray-900">
                    {(link.clicks ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[13px] text-gray-900">
                    {(link.sales ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[13px] text-gray-900">
                    {formatCurrency(link.revenue ?? 0)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigator.clipboard.writeText(buildShortUrl(link.slug))}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copiar link"
                      >
                        <Copy size={13} />
                      </button>
                      <a
                        href={`/dashboard/analytics?linkId=${link.id}`}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Ver analytics"
                      >
                        <BarChart2 size={13} />
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
  )
}

function CampaignAnalyticsTab({
  campaign,
  analytics,
}: {
  campaign: CampaignDetail
  analytics: Analytics
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[13px] font-semibold text-gray-900">Analytics de la campaña</h3>
        <a
          href={`/dashboard/analytics?campaignId=${campaign.id}`}
          className="text-[12px] text-brand-600 hover:text-brand-700 transition-colors"
        >
          Ver analytics completo →
        </a>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Clicks</p>
          <p className="text-xl font-semibold text-gray-900">{analytics.clicks.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Conversions</p>
          <p className="text-xl font-semibold text-gray-900">
            {analytics.conversions.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Revenue</p>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(analytics.revenue)}</p>
        </div>
        <div className="bg-brand-50 rounded-xl border border-brand-100 p-4">
          <p className="text-[11px] text-brand-500 uppercase tracking-wider mb-1">Commissions</p>
          <p className="text-xl font-semibold text-brand-700">
            {formatCurrency(analytics.commissions)}
          </p>
        </div>
      </div>

      {/* Creators in campaign */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Creators en la campaña
        </h4>
        {campaign.creators.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay creators en esta campaña.</p>
        ) : (
          <div className="space-y-1">
            {campaign.creators.map((cc) => {
              const initials = cc.creator.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
              return (
                <div
                  key={cc.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-rose-400">{initials}</span>
                    </div>
                    <span className="text-[13px] text-gray-900">{cc.creator.name}</span>
                    {cc.discountCode && (
                      <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                        {cc.discountCode}
                      </span>
                    )}
                  </div>
                  <a
                    href={`/dashboard/analytics?creatorId=${cc.creator.id}`}
                    className="text-[11px] text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    Ver analytics →
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface CreatorConfig {
  commissionPct: string
  discountCode: string
}

const GIFTING_STATUS: Record<string, { label: string; style: string }> = {
  PENDING: { label: "Pendiente", style: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "Procesando", style: "bg-blue-100 text-blue-700" },
  SENT: { label: "Enviado", style: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Entregado", style: "bg-brand-100 text-brand-700" },
  CONFIRMED: { label: "Confirmado", style: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelado", style: "bg-red-100 text-red-600" },
}

function GiftingTab({
  orders,
  loading,
  campaign,
  onGiftingCreated,
}: {
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
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm font-medium text-brand-600 hover:underline mt-2"
          >
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
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Package size={15} className="text-brand-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{order.creator.name}</p>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.style}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {products.map((p) => `${p.quantity}x ${p.name}`).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(order.totalValue)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString("es-AR")}
                  </p>
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
          onCreated={() => {
            setShowCreate(false)
            onGiftingCreated()
          }}
        />
      )}
    </div>
  )
}

interface CreatorSearchResult {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  email: string
  instagram: string | null
  alreadyInCampaign: boolean
}

function AddCreatorsModal({
  campaignId,
  workspaceId,
  onClose,
  onAdded,
}: {
  campaignId: string
  workspaceId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [mode, setMode] = useState<"search" | "invite">("search")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CreatorSearchResult[]>([])
  const [selected, setSelected] = useState<CreatorSearchResult | null>(null)
  const [searching, setSearching] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")

  const [withCommission, setWithCommission] = useState(true)
  const [commissionPct, setCommissionPct] = useState("10")
  const [withDiscount, setWithDiscount] = useState(true)
  const [discountCode, setDiscountCode] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode !== "search" || !query || query.length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/creators/search?q=${encodeURIComponent(query)}&campaignId=${campaignId}&workspaceId=${workspaceId}`
        )
        const data = await res.json()
        setResults(data.creators || [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, mode, campaignId, workspaceId])

  const handleSelectCreator = (creator: CreatorSearchResult) => {
    setSelected(creator)
    const name = creator.firstName || creator.name?.split(" ")[0] || ""
    const code =
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8) + commissionPct
    setDiscountCode(code)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (mode === "search" && selected) {
        await fetch(`/api/campaigns/${campaignId}/creators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorId: selected.id,
            ...(withCommission && commissionPct ? { commissionPct: parseFloat(commissionPct) } : {}),
            ...(withDiscount && discountCode ? { discountCode } : {}),
          }),
        })
      } else {
        await fetch(`/api/campaigns/${campaignId}/creators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email }),
        })
      }
      onAdded()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Agregar creator</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("search")
                setSelected(null)
              }}
              className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
                mode === "search"
                  ? "bg-white shadow-sm text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Buscar existente
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("invite")
                setSelected(null)
                setQuery("")
              }}
              className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
                mode === "invite"
                  ? "bg-white shadow-sm text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Invitar nuevo
            </button>
          </div>

          {/* Search mode — no selection yet */}
          {mode === "search" && !selected && (
            <div>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, email o @instagram..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              {results.length > 0 && (
                <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {results.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => handleSelectCreator(creator)}
                      disabled={creator.alreadyInCampaign}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                        creator.alreadyInCampaign ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 text-xs font-semibold flex-shrink-0">
                        {creator.firstName?.[0] || creator.name?.[0] || "?"}
                        {creator.lastName?.[0] || ""}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {creator.firstName
                            ? `${creator.firstName} ${creator.lastName || ""}`
                            : creator.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{creator.email}</span>
                          {creator.instagram && (
                            <span className="text-xs text-gray-400">@{creator.instagram}</span>
                          )}
                        </div>
                      </div>
                      {creator.alreadyInCampaign && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Ya está
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <div className="mt-3 text-center py-4">
                  <p className="text-xs text-gray-400 mb-2">
                    No se encontraron creators con &ldquo;{query}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode("invite")}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Invitar creator nuevo →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Creator selected */}
          {mode === "search" && selected && (
            <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold flex-shrink-0">
                {selected.firstName?.[0] || selected.name?.[0] || "?"}
                {selected.lastName?.[0] || ""}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {selected.firstName
                    ? `${selected.firstName} ${selected.lastName || ""}`
                    : selected.name}
                </p>
                <p className="text-xs text-gray-500">{selected.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null)
                  setQuery("")
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cambiar
              </button>
            </div>
          )}

          {/* Invite mode fields */}
          {mode === "invite" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      const code =
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 8) + commissionPct
                      setDiscountCode(code)
                    }}
                    placeholder="Camila"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="García"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camila@ejemplo.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>
          )}

          {/* Commission + discount toggles */}
          {(selected || mode === "invite") && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {/* Commission toggle */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWithCommission((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">Comisión por venta</p>
                    <p className="text-xs text-gray-400">El creator gana un % de cada conversión</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${withCommission ? "bg-gray-900" : "bg-gray-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${withCommission ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>
                {withCommission && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5 mt-3">Comisión (%)</label>
                    <input
                      type="number"
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(e.target.value)}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                )}
              </div>

              {/* Discount toggle */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWithDiscount((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">Descuento para compradores</p>
                    <p className="text-xs text-gray-400">Código de descuento para los clientes</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${withDiscount ? "bg-gray-900" : "bg-gray-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${withDiscount ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>
                {withDiscount && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5 mt-3">Código de descuento</label>
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="CAMILA10"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 px-1">Aplican solo para esta campaña.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading ||
              (mode === "search" && !selected) ||
              (mode === "invite" && (!firstName || !email))
            }
            className="flex-1 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
          >
            {loading
              ? "Agregando..."
              : mode === "search"
                ? "Agregar a la campaña"
                : "Enviar invitación"}
          </button>
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
  const [selectedCreators, setSelectedCreators] = useState<
    { id: string; name: string; address: string | null; city: string | null }[]
  >([])
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
      setSelected((prev) =>
        prev.map((s) => (s.variantId === variant.id ? { ...s, quantity: s.quantity + 1 } : s))
      )
    } else {
      const name = productName(product)
      const variantName = product.variants.length > 1 ? variant.sku || `Variante ${variant.id}` : ""
      setSelected((prev) => [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          name,
          variantName,
          price: parseFloat(variant.price) || 0,
          quantity: 1,
        },
      ])
    }
  }

  const updateQty = (variantId: number, delta: number) => {
    setSelected((prev) =>
      prev
        .map((s) => (s.variantId === variantId ? { ...s, quantity: s.quantity + delta } : s))
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
      if (failed) {
        setError(failed.error)
        return
      }
      onCreated()
    } catch {
      setError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleCreator = (c: (typeof campaignCreators)[0]) => {
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
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      step === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i + 1}.{" "}
                    {s === "creator" ? "Creator" : s === "products" ? "Productos" : "Confirmar"}
                  </span>
                  {i < 2 && <span className="text-gray-200 text-xs">›</span>}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
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
                          isSelected
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                          {c.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
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
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
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
                    <p className="text-sm text-gray-400 text-center py-8">
                      No se encontraron productos.
                    </p>
                  ) : (
                    filteredProducts.map((product) => (
                      <div key={product.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center gap-3 mb-2">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0].src}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-gray-400" />
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-900">
                            {productName(product)}
                          </p>
                        </div>
                        <div className="space-y-1.5 pl-13">
                          {product.variants.map((variant) => {
                            const inCart = selected.find((s) => s.variantId === variant.id)
                            return (
                              <div
                                key={variant.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  {product.variants.length > 1 && (
                                    <span className="text-xs text-gray-500">
                                      {variant.sku || `Var. ${variant.id}`}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-1">
                                    ${parseFloat(variant.price).toLocaleString("es-AR")}
                                  </span>
                                </div>
                                {inCart ? (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => updateQty(variant.id, -1)}
                                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100"
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span className="text-sm font-medium w-5 text-center">
                                      {inCart.quantity}
                                    </span>
                                    <button
                                      onClick={() => addVariant(product, variant)}
                                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100"
                                    >
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
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                      Seleccionados
                    </p>
                    {selected.map((p) => (
                      <div key={p.variantId} className="text-xs">
                        <p className="font-medium text-gray-800 leading-tight">{p.name}</p>
                        {p.variantName && <p className="text-gray-400">{p.variantName}</p>}
                        <p className="text-gray-500">
                          {p.quantity}x ${p.price.toLocaleString("es-AR")}
                        </p>
                      </div>
                    ))}
                    <div className="mt-auto pt-2 border-t border-gray-100">
                      <p className="text-[11px] text-gray-400">Valor total</p>
                      <p className="text-sm font-semibold text-gray-900">
                        ${totalValue.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setStep("creator")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
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
                  {selectedCreators.length === 1
                    ? "Creator"
                    : `${selectedCreators.length} Creators`}
                </p>
                {selectedCreators.map((c) => (
                  <p key={c.id} className="text-sm font-medium text-gray-900">
                    {c.name}
                  </p>
                ))}
              </div>

              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Productos
                </p>
                <div className="space-y-2">
                  {selected.map((p) => (
                    <div key={p.variantId} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {p.quantity}x {p.name}
                        {p.variantName ? ` - ${p.variantName}` : ""}
                      </span>
                      <span className="text-gray-500 flex-shrink-0 ml-3">
                        ${(p.price * p.quantity).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${totalValue.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Campaña
                </p>
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
              <button
                onClick={() => setStep("products")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
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
          <button
            onClick={onCreateBriefing}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
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
                      <span className="text-[15px] font-semibold text-gray-900 truncate">
                        {b.subject}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          b.status === "SENT"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {b.status === "SENT"
                          ? "Enviado"
                          : b.status === "DRAFT"
                            ? "Borrador"
                            : b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-gray-400 mt-1">
                      <span>
                        {b._count.recipients} destinatario{b._count.recipients !== 1 ? "s" : ""}
                      </span>
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
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        <form
          id="briefing-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-auto p-6 space-y-4"
        >
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Documentos adjuntos
            </label>
            <div className="space-y-2">
              {assets.map((asset, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 gap-2"
                >
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
              onClick={() => {
                sendIntentRef.current = false
              }}
              className="px-4 py-2 text-[13px] text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Guardar borrador"}
            </button>
            <button
              type="submit"
              form="briefing-form"
              disabled={submitting || !form.subject || !form.body || creatorCount === 0}
              onClick={() => {
                sendIntentRef.current = true
              }}
              className="px-4 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting
                ? "Enviando..."
                : `Enviar a ${creatorCount} creator${creatorCount !== 1 ? "s" : ""}`}
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
  PENDING: { label: "Pendiente", style: "bg-amber-100 text-amber-700" },
  ACCEPTED: { label: "Aceptado", style: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rechazado", style: "bg-red-100 text-red-600" },
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
    ALL: applications.length,
    PENDING: applications.filter((a) => a.status === "PENDING").length,
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
              filter === f ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f === "ALL"
              ? "Todos"
              : f === "PENDING"
                ? "Pendientes"
                : f === "ACCEPTED"
                  ? "Aceptados"
                  : "Rechazados"}
            <span
              className={`ml-1.5 text-[11px] ${filter === f ? "text-white/60" : "text-gray-400"}`}
            >
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
            {filter === "ALL"
              ? "Todavía no hay aplicaciones."
              : `No hay aplicaciones ${filter === "PENDING" ? "pendientes" : filter === "ACCEPTED" ? "aceptadas" : "rechazadas"}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => {
            const isExpanded = expandedId === app.id
            const cfg = APP_STATUS[app.status]
            const initials = app.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{app.name}</span>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${cfg.style}`}
                      >
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
                    {app.answers && app.answers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                        <p className="text-[11px] font-medium text-gray-500">Respuestas</p>
                        {app.answers.map((ans) => (
                          <div key={ans.id}>
                            <p className="text-[11px] text-gray-400">{ans.question.question}</p>
                            <p className="text-[13px] text-gray-900 mt-0.5">{ans.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {app.notes && (
                      <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-[12px] text-gray-600">
                        <span className="font-medium text-gray-500">Notas: </span>
                        {app.notes}
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
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-gray-600">
            {isAccept ? (
              <>
                ¿Aceptar a <strong>{application.name}</strong>? Se le enviará un email para unirse
                al programa.
              </>
            ) : (
              <>
                ¿Rechazar a <strong>{application.name}</strong>? Se le enviará un email notificando
                la decisión.
              </>
            )}
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Notas internas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                isAccept ? "Motivo de aceptación, observaciones..." : "Motivo del rechazo..."
              }
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
