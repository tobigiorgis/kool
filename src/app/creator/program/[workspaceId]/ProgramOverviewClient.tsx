"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface Props {
  copyValue?: string
  type: "link" | "code" | "chart"
  chartData?: { amount: number; date: string }[]
}

function groupByMonth(data: { amount: number; date: string }[]) {
  const map: Record<string, number> = {}
  for (const d of data) {
    const key = new Date(d.date).toLocaleDateString("es-AR", {
      month: "short",
      year: "2-digit",
    })
    map[key] = (map[key] ?? 0) + d.amount
  }
  return Object.entries(map).map(([month, amount]) => ({ month, amount }))
}

export default function ProgramOverviewClient({ copyValue, type, chartData }: Props) {
  const [copied, setCopied] = useState(false)

  if (type === "chart" && chartData) {
    const grouped = groupByMonth(chartData)
    return (
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={grouped} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F8BBD0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F8BBD0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #f3f4f6",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) =>
                new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  minimumFractionDigits: 0,
                }).format(v)
              }
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#F8BBD0"
              strokeWidth={2}
              fill="url(#earningsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const handleCopy = () => {
    if (!copyValue) return
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
    >
      {copied ? (
        <Check size={13} className="text-green-500" />
      ) : (
        <Copy size={13} />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  )
}
