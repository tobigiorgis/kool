"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  sub: string
  /** La métrica protagonista lleva fill rosa y pulse de tracking en vivo */
  featured?: boolean
  live?: boolean
  data: number[]
}

export function MetricCard({ label, value, sub, featured, live, data }: MetricCardProps) {
  const chartData = data.map((v) => ({ v }))
  const stroke = featured ? "#FB7185" : "#B4B2B8"

  return (
    <div
      className={cn(
        "rounded-card p-5 flex flex-col gap-3",
        featured ? "bg-pink-fill" : "bg-surface"
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium flex items-center gap-1.5",
          featured ? "text-pink-deep" : "text-ink-secondary"
        )}
      >
        {label}
        {live && <span className="kool-dot kool-dot-pulse" />}
      </p>
      <div>
        <p className="font-mono text-2xl tnum tracking-[-0.03em] text-ink">{value}</p>
        <p
          className={cn(
            "font-mono text-[11px] tnum mt-0.5",
            featured ? "text-pink-text" : "text-ink-tertiary"
          )}
        >
          {sub}
        </p>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={featured ? "kg-pink" : "kg-neutral"} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.16} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#${featured ? "kg-pink" : "kg-neutral"})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
