"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

interface ChartPoint {
  date: string
  clicks: number
  sales: number
}

type Period = "1d" | "7d" | "30d"

export default function AnalyticsPage() {
  const params = useParams()
  const campaignId = params.campaignId as string

  const [period, setPeriod] = useState<Period>("7d")
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/campaigns/${campaignId}/analytics/chart?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d.chartData ?? []))
      .finally(() => setLoading(false))
  }, [campaignId, period])

  const totalClicks = data.reduce((s, d) => s + d.clicks, 0)
  const totalSales = data.reduce((s, d) => s + d.sales, 0)
  const maxClicks = Math.max(...data.map((d) => d.clicks), 1)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-5">
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
              period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {p === "1d" ? "24h" : p === "7d" ? "7 días" : "30 días"}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-400 mb-1">Clicks</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">{totalClicks.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-400 mb-1">Ventas</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">{totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-400 mb-1">Conversión</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">
            {totalClicks > 0 ? ((totalSales / totalClicks) * 100).toFixed(1) : "0.0"}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-[13px] font-semibold text-gray-900 mb-5">Clicks en el tiempo</p>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={18} className="animate-spin text-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-gray-400">Sin datos en este período.</p>
          </div>
        ) : (
          <div className="flex items-end gap-1" style={{ height: "120px" }}>
            {data.map((d) => {
              const pct = (d.clicks / maxClicks) * 100
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
                    style={{ bottom: `calc(${pct}% + 12px)` }}
                  >
                    {d.clicks} clicks
                  </div>
                  <div className="w-full rounded-t-md bg-violet-100 relative" style={{ height: "104px" }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-md bg-violet-400 transition-all"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.date}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
