"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  MousePointerClick,
  Users,
  ShoppingCart,
  TrendingUp,
  Globe,
  Smartphone,
  Wifi,
  X,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { shortUrlLabel } from "@/lib/links"

type Period = "7d" | "30d" | "90d"
type MetricKey = "clicks" | "unique_clicks" | "conversions" | "convRate"

interface FilterInfo {
  linkSlug: string | null
  campaignName: string | null
  creatorName: string | null
}

interface DayPoint {
  date: string
  clicks: number
  unique_clicks: number
  conversions: number
  convRate?: number
}

interface AnalyticsData {
  stats: { clicks: number; unique_clicks: number }
  clicksByDay: DayPoint[]
  countries: { country: string; clicks: number }[]
  devices: { device: string; clicks: number; percentage: number }[]
  sources: { source: string; clicks: number; percentage: number }[]
  conversions: number
  isMock: boolean
  filterInfo: FilterInfo
}

const METRICS: {
  key: MetricKey
  label: string
  stroke: string
  dash?: string
  icon: React.ReactNode
  bg: string
  textColor: string
}[] = [
  {
    key: "clicks",
    label: "Clics totales",
    stroke: "#FB7185",
    icon: <MousePointerClick size={15} className="text-brand-500" />,
    bg: "bg-brand-50",
    textColor: "text-brand-600",
  },
  {
    key: "unique_clicks",
    label: "Clics únicos",
    stroke: "#3b82f6",
    dash: "4 2",
    icon: <Users size={15} className="text-blue-500" />,
    bg: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    key: "conversions",
    label: "Conversiones",
    stroke: "#a855f7",
    icon: <ShoppingCart size={15} className="text-purple-500" />,
    bg: "bg-purple-50",
    textColor: "text-purple-600",
  },
  {
    key: "convRate",
    label: "Tasa de conversión",
    stroke: "#f59e0b",
    dash: "4 2",
    icon: <TrendingUp size={15} className="text-orange-500" />,
    bg: "bg-orange-50",
    textColor: "text-orange-600",
  },
]

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#FB7185",
  desktop: "#3b82f6",
  tablet: "#f59e0b",
}
const SOURCE_COLORS: Record<string, string> = {
  instagram: "#e1306c",
  tiktok: "#000000",
  whatsapp: "#25d366",
  direct: "#6366f1",
  other: "#9ca3af",
}
const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina",
  MX: "México",
  CL: "Chile",
  CO: "Colombia",
  PE: "Perú",
  UY: "Uruguay",
  BR: "Brasil",
  ES: "España",
}
const PERIOD_LABELS: Record<Period, string> = { "7d": "7 días", "30d": "30 días", "90d": "90 días" }

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-4 lg:p-8 text-sm text-gray-400">Cargando...</div>}>
      <AnalyticsContent />
    </Suspense>
  )
}

function AnalyticsContent() {
  const searchParams = useSearchParams()
  const linkId = searchParams.get("linkId")
  const campaignId = searchParams.get("campaignId")
  const creatorId = searchParams.get("creatorId")

  const [period, setPeriod] = useState<Period>("30d")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MetricKey[]>(["clicks", "unique_clicks"])

  const buildApiUrl = useCallback(
    (p: string) => {
      const params = new URLSearchParams({ period: p })
      if (linkId) params.set("linkId", linkId)
      if (campaignId) params.set("campaignId", campaignId)
      if (creatorId) params.set("creatorId", creatorId)
      return `/api/analytics?${params.toString()}`
    },
    [linkId, campaignId, creatorId]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildApiUrl(period))
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [period, buildApiUrl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleMetric = (key: MetricKey) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev
      if (prev.length >= 2) return [prev[1], key]
      return [...prev, key]
    })
  }

  const totalConvRate =
    data && data.stats.clicks > 0
      ? ((data.conversions / data.stats.clicks) * 100).toFixed(1)
      : "0.0"

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" })

  const hasFilter = !!(linkId || campaignId || creatorId)
  const filterLabel = data?.filterInfo
    ? data.filterInfo.linkSlug
      ? shortUrlLabel(data.filterInfo.linkSlug)
      : (data.filterInfo.campaignName ?? data.filterInfo.creatorName ?? "")
    : ""

  const getTitle = () => {
    if (linkId) return "Analytics · Link"
    if (campaignId) return "Analytics · Campaña"
    if (creatorId) return "Analytics · Creator"
    return "Analytics"
  }

  // Add convRate to each day point
  const chartData: DayPoint[] = (data?.clicksByDay ?? []).map((d) => ({
    ...d,
    convRate: d.clicks > 0 ? parseFloat(((d.conversions / d.clicks) * 100).toFixed(2)) : 0,
  }))

  const totals: Record<MetricKey, string> = {
    clicks: loading ? "—" : formatNumber(data?.stats.clicks ?? 0),
    unique_clicks: loading ? "—" : formatNumber(data?.stats.unique_clicks ?? 0),
    conversions: loading ? "—" : formatNumber(data?.conversions ?? 0),
    convRate: loading ? "—" : `${totalConvRate}%`,
  }

  const selectedMeta = selected.map((k) => METRICS.find((m) => m.key === k)!)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 lg:mb-8">
        <div>
          {hasFilter && (
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/dashboard/analytics"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Analytics
              </Link>
              <span className="text-xs text-gray-300">/</span>
              <span className="text-xs text-gray-700 font-medium">{filterLabel}</span>
              <Link
                href="/dashboard/analytics"
                className="ml-1 flex items-center gap-0.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                <X size={11} />
              </Link>
            </div>
          )}
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{getTitle()}</h1>
          <p className="text-sm text-gray-500 mt-1">Estadísticas de clicks y conversiones</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                period === p
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards — click to toggle, max 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {METRICS.map((m) => {
          const isSelected = selected.includes(m.key)
          return (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`text-left bg-white rounded-xl border p-4 lg:p-5 transition-colors duration-fast ${
                isSelected
                  ? "border-gray-300 shadow-sm ring-1 ring-gray-200"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{m.label}</span>
                <div className={`w-7 h-7 rounded-lg ${m.bg} flex items-center justify-center`}>
                  {m.icon}
                </div>
              </div>
              <p
                className={`text-xl lg:text-2xl font-semibold tracking-tight ${isSelected ? m.textColor : "text-gray-900"}`}
              >
                {totals[m.key]}
              </p>
              {isSelected && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div
                    className="w-4 h-0.5 rounded"
                    style={{
                      backgroundColor: m.stroke,
                      ...(m.dash
                        ? {
                            backgroundImage: `repeating-linear-gradient(90deg, ${m.stroke} 0, ${m.stroke} 4px, transparent 4px, transparent 6px)`,
                            backgroundColor: "transparent",
                          }
                        : {}),
                    }}
                  />
                  <span className="text-[10px] text-gray-400">visible</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Line chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 lg:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Evolución temporal</h2>
          <div className="flex items-center gap-4">
            {selectedMeta.map((m) => (
              <div key={m.key} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: m.stroke }} />
                <span className="text-xs text-gray-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip
                labelFormatter={(l) => formatDate(l as string)}
                formatter={(v: number, name: string) => {
                  const m = METRICS.find((x) => x.key === name)
                  const label = m?.label ?? name
                  const val = name === "convRate" ? `${v}%` : v.toLocaleString()
                  return [val, label]
                }}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              {selectedMeta.map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.stroke}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  strokeDasharray={m.dash}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Fila inferior: países + dispositivos + fuentes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {/* Top países */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Top países</h2>
          </div>
          {loading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2.5">
              {(data?.countries ?? []).map(({ country, clicks }) => {
                const max = data?.countries[0]?.clicks || 1
                return (
                  <div key={country}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">
                        {COUNTRY_NAMES[country] ?? country}
                      </span>
                      <span className="text-xs font-medium text-gray-900">
                        {clicks.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-1.5 rounded-full bg-brand-400"
                        style={{ width: `${(clicks / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {(data?.countries ?? []).length === 0 && (
                <p className="text-xs text-gray-400">Sin datos para el período.</p>
              )}
            </div>
          )}
        </div>

        {/* Dispositivos */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Dispositivos</h2>
          </div>
          {loading ? (
            <Skeleton />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={data?.devices ?? []}
                    dataKey="clicks"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                  >
                    {(data?.devices ?? []).map(({ device }) => (
                      <Cell key={device} fill={DEVICE_COLORS[device] ?? "#9ca3af"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [v.toLocaleString(), "Clics"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {(data?.devices ?? []).map(({ device, percentage }) => (
                  <div key={device} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: DEVICE_COLORS[device] ?? "#9ca3af" }}
                      />
                      <span className="text-xs text-gray-600 capitalize">{device}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">{percentage}%</span>
                  </div>
                ))}
                {(data?.devices ?? []).length === 0 && (
                  <p className="text-xs text-gray-400">Sin datos para el período.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Fuentes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Fuentes</h2>
          </div>
          {loading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2.5">
              {(data?.sources ?? []).map(({ source, percentage }) => (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 capitalize">{source}</span>
                    <span className="text-xs font-medium text-gray-900">{percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${percentage}%`,
                        background: SOURCE_COLORS[source] ?? "#9ca3af",
                      }}
                    />
                  </div>
                </div>
              ))}
              {(data?.sources ?? []).length === 0 && (
                <p className="text-xs text-gray-400">Sin datos para el período.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  )
}
