"use client"

import { useEffect, useState, useCallback } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts"
import { TrendingUp, MousePointerClick, Users, ShoppingCart, Globe, Smartphone, Wifi } from "lucide-react"
import { formatNumber } from "@/lib/utils"

type Period = "7d" | "30d" | "90d"

interface AnalyticsData {
  stats: { clicks: number; unique_clicks: number }
  clicksByDay: { date: string; clicks: number; unique_clicks: number }[]
  countries: { country: string; clicks: number }[]
  devices: { device: string; clicks: number; percentage: number }[]
  sources: { source: string; clicks: number; percentage: number }[]
  conversions: number
  isMock: boolean
}

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#00C46A",
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
  AR: "Argentina", MX: "México", CL: "Chile", CO: "Colombia",
  PE: "Perú", UY: "Uruguay", BR: "Brasil", ES: "España",
}

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 días", "30d": "30 días", "90d": "90 días",
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?period=${period}`)
      if (res.ok) {
        setData(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const conversionRate =
    data && data.stats.clicks > 0
      ? ((data.conversions / data.stats.clicks) * 100).toFixed(1)
      : "0.0"

  // Format date label
  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Estadísticas de clicks y conversiones
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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

      {/* Mock data notice */}
      {data?.isMock && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700">
            Datos de ejemplo — Conectá Tinybird en las variables de entorno para ver datos reales.
          </p>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Clics totales"
          value={loading ? "—" : formatNumber(data?.stats.clicks ?? 0)}
          icon={<MousePointerClick size={16} className="text-brand-500" />}
          bg="bg-brand-50"
        />
        <StatCard
          label="Clics únicos"
          value={loading ? "—" : formatNumber(data?.stats.unique_clicks ?? 0)}
          icon={<Users size={16} className="text-blue-500" />}
          bg="bg-blue-50"
        />
        <StatCard
          label="Conversiones"
          value={loading ? "—" : formatNumber(data?.conversions ?? 0)}
          icon={<ShoppingCart size={16} className="text-purple-500" />}
          bg="bg-purple-50"
        />
        <StatCard
          label="Tasa de conversión"
          value={loading ? "—" : `${conversionRate}%`}
          icon={<TrendingUp size={16} className="text-orange-500" />}
          bg="bg-orange-50"
        />
      </div>

      {/* Gráfico de clics por día */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Clics por día</h2>
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.clicksByDay ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
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
                formatter={(v: number, name: string) => [
                  v.toLocaleString(),
                  name === "clicks" ? "Clics" : "Únicos",
                ]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#00C46A"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="unique_clicks"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-brand-400 rounded" />
            <span className="text-xs text-gray-500">Clics totales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-blue-400 rounded border-dashed" style={{ borderBottom: "2px dashed #3b82f6", height: 0 }} />
            <span className="text-xs text-gray-500">Clics únicos</span>
          </div>
        </div>
      </div>

      {/* Fila inferior: países + dispositivos + fuentes */}
      <div className="grid grid-cols-3 gap-6">
        {/* Top países */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Top países</h2>
          </div>
          {loading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2.5">
              {(data?.countries ?? []).map(({ country, clicks }, i) => {
                const max = data?.countries[0]?.clicks || 1
                return (
                  <div key={country}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">
                        {COUNTRY_NAMES[country] ?? country}
                      </span>
                      <span className="text-xs font-medium text-gray-900">{clicks.toLocaleString()}</span>
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
            </div>
          )}
        </div>

        {/* Dispositivos */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
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
              </div>
            </>
          )}
        </div>

        {/* Fuentes */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Fuentes</h2>
          </div>
          {loading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2.5">
              {(data?.sources ?? []).map(({ source, clicks, percentage }) => (
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, bg,
}: { label: string; value: string; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
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
