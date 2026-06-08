"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"

interface MetricCardProps {
  label: string
  value: string
  sub: string
  color: "rose" | "violet" | "green"
  data: number[]
}

const colorMap = {
  rose:   { stroke: "#FB7185", fill: "#FB7185", id: "roseGrad" },
  violet: { stroke: "#8B5CF6", fill: "#8B5CF6", id: "violetGrad" },
  green:  { stroke: "#00C46A", fill: "#00C46A", id: "greenGrad" },
}

export function MetricCard({ label, value, sub, color, data }: MetricCardProps) {
  const { stroke, fill, id } = colorMap[color]
  const chartData = data.map((v) => ({ v }))

  return (
    <div className="border border-[#f0f0f0] rounded-xl p-5 flex flex-col gap-3">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={fill} stopOpacity={0.18} />
                <stop offset="95%" stopColor={fill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#${id})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
