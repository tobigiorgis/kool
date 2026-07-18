"use client"

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface TimePoint {
  label: string
  value: number
}

interface AdminChartsProps {
  weeklyData: {
    clicks: TimePoint[]
    conversions: TimePoint[]
    creators: TimePoint[]
    workspaces: TimePoint[]
  }
  monthlyData: {
    clicks: TimePoint[]
    conversions: TimePoint[]
    creators: TimePoint[]
    workspaces: TimePoint[]
  }
}

function MiniChart({ data, color = "#FB7185" }: { data: TimePoint[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
}

function TimeSeriesChart({
  data,
  color = "#FB7185",
  label,
}: {
  data: TimePoint[]
  color?: string
  label: string
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-ink-secondary mb-2">{label}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: "#999" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            labelStyle={{ fontWeight: 600, marginBottom: 2 }}
          />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={32} name={label} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AdminCharts({ weeklyData, monthlyData }: AdminChartsProps) {
  return (
    <div className="space-y-8">
      {/* Weekly */}
      <div>
        <h2 className="text-[13px] font-semibold text-ink mb-4">Semana a semana (últimas 12)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={weeklyData.clicks} color="#FB7185" label="Clicks" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={weeklyData.conversions} color="#34D399" label="Conversiones" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={weeklyData.creators} color="#60A5FA" label="Nuevos creators" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={weeklyData.workspaces} color="#A78BFA" label="Nuevas marcas" />
          </div>
        </div>
      </div>

      {/* Monthly */}
      <div>
        <h2 className="text-[13px] font-semibold text-ink mb-4">Mes a mes (últimos 12)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={monthlyData.clicks} color="#FB7185" label="Clicks" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={monthlyData.conversions} color="#34D399" label="Conversiones" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={monthlyData.creators} color="#60A5FA" label="Nuevos creators" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <TimeSeriesChart data={monthlyData.workspaces} color="#A78BFA" label="Nuevas marcas" />
          </div>
        </div>
      </div>
    </div>
  )
}
