"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

interface ChartPoint {
  date: string
  clicks: number
  uniqueClicks: number
  conversions: number
}

type Period = "1d" | "7d" | "30d"
type MetricKey = "clicks" | "uniqueClicks" | "conversions" | "convRate"

const METRICS: {
  key: MetricKey
  label: string
  color: string
  barColor: string
  trackColor: string
}[] = [
  {
    key: "clicks",
    label: "Clicks totales",
    color: "text-violet-600",
    barColor: "bg-violet-400",
    trackColor: "bg-violet-100",
  },
  {
    key: "uniqueClicks",
    label: "Clicks únicos",
    color: "text-blue-600",
    barColor: "bg-blue-400",
    trackColor: "bg-blue-100",
  },
  {
    key: "conversions",
    label: "Conversiones",
    color: "text-green-600",
    barColor: "bg-green-400",
    trackColor: "bg-green-100",
  },
  {
    key: "convRate",
    label: "Tasa de conv.",
    color: "text-amber-600",
    barColor: "bg-amber-400",
    trackColor: "bg-amber-100",
  },
]

function getValue(point: ChartPoint, key: MetricKey): number {
  if (key === "convRate") return point.clicks > 0 ? (point.conversions / point.clicks) * 100 : 0
  return point[key]
}

function formatLabel(date: string, period: Period): string {
  const d = new Date(date)
  if (period === "1d") return `${d.getHours()}h`
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

function formatValue(val: number, key: MetricKey): string {
  if (key === "convRate") return `${val.toFixed(1)}%`
  return val.toLocaleString()
}

export default function AnalyticsPage() {
  const params = useParams()
  const campaignId = params.campaignId as string

  const [period, setPeriod] = useState<Period>("7d")
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MetricKey[]>(["clicks", "conversions"])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/campaigns/${campaignId}/analytics/chart?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d.chartData ?? []))
      .finally(() => setLoading(false))
  }, [campaignId, period])

  const toggleMetric = (key: MetricKey) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev
      if (prev.length >= 2) return [prev[1], key]
      return [...prev, key]
    })
  }

  const totals = {
    clicks: data.reduce((s, d) => s + d.clicks, 0),
    uniqueClicks: data.reduce((s, d) => s + d.uniqueClicks, 0),
    conversions: data.reduce((s, d) => s + d.conversions, 0),
    convRate: 0,
  }
  const totalClicks = totals.clicks
  const totalConversions = totals.conversions
  totals.convRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

  // Max per selected metric for normalization
  const maxes = Object.fromEntries(
    selected.map((key) => [key, Math.max(...data.map((d) => getValue(d, key)), 1)])
  ) as Record<MetricKey, number>

  const selectedMeta = selected.map((key) => METRICS.find((m) => m.key === key)!)

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Performance de tus links</p>
      </div>
      <div className="border-t border-gray-200" />

      {/* Period selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["1d", "7d", "30d"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              period === p
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {p === "1d" ? "24h" : p === "7d" ? "7 días" : "30 días"}
          </button>
        ))}
      </div>

      {/* Metric cards — click to toggle, max 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map((m) => {
          const isSelected = selected.includes(m.key)
          return (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`text-left p-4 rounded-2xl border transition-colors duration-fast ${
                isSelected
                  ? "border-gray-300 bg-white shadow-sm ring-1 ring-gray-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-gray-400">{m.label}</p>
                {isSelected && <span className={`w-2 h-2 rounded-full ${m.barColor}`} />}
              </div>
              <p
                className={`text-xl font-semibold tracking-tight ${isSelected ? m.color : "text-gray-900"}`}
              >
                {formatValue(totals[m.key], m.key)}
              </p>
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[13px] font-semibold text-gray-900">
            {selectedMeta.map((m) => m.label).join(" · ")}
          </p>
          <div className="flex items-center gap-3">
            {selectedMeta.map((m) => (
              <div key={m.key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${m.barColor}`} />
                <span className="text-[11px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={18} className="animate-spin text-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-gray-400">Sin datos en este período.</p>
          </div>
        ) : (
          <div className="flex items-end gap-0.5" style={{ height: "128px" }}>
            {data.map((d) => {
              const label = formatLabel(d.date, period)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  {/* Bars */}
                  <div className="w-full flex items-end gap-px" style={{ height: "108px" }}>
                    {selectedMeta.map((m) => {
                      const val = getValue(d, m.key)
                      const pct = (val / maxes[m.key]) * 100
                      return (
                        <div
                          key={m.key}
                          className={`flex-1 ${m.trackColor} rounded-t-sm relative`}
                          style={{ height: "108px" }}
                        >
                          <div
                            className={`absolute bottom-0 w-full rounded-t-sm ${m.barColor} transition-colors duration-fast`}
                            style={{ height: `${pct}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {m.label}: {formatValue(val, m.key)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
