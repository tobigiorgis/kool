"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, AlertCircle, TrendingUp } from "lucide-react"

interface DropSummary {
  id: string
  name: string
  status: "PRE_LAUNCH" | "ACTIVE" | "CLOSED"
  currentRevenue: number
  totalExpenses: number
  totalPendingDebt: number
  currentCash: number
  breakEvenPct: number | null
  soldPct: number
  profit: number
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  PRE_LAUNCH: "Pre-lanzamiento",
  ACTIVE: "Activo",
  CLOSED: "Cerrado",
}

const STATUS_DOT: Record<string, string> = {
  PRE_LAUNCH: "bg-gray-300",
  ACTIVE: "bg-[#00C46A]",
  CLOSED: "bg-gray-400",
}

export default function DropsFinancialsPage() {
  const [drops, setDrops] = useState<DropSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/drops")
      .then((r) => r.json())
      .then(async (d) => {
        const list = d.drops ?? []
        // Fetch financials for each drop in parallel
        const summaries = await Promise.all(
          list.map(async (drop: { id: string; name: string; status: string }) => {
            try {
              const res = await fetch(`/api/drops/${drop.id}/financials`)
              if (!res.ok) return null
              const fin = await res.json()
              return {
                id: drop.id,
                name: drop.name,
                status: drop.status,
                currentRevenue: fin.currentRevenue,
                totalExpenses: fin.totalExpenses,
                totalPendingDebt: fin.totalPendingDebt,
                currentCash: fin.currentCash,
                breakEvenPct: fin.breakEvenPct,
                soldPct: fin.soldPct,
                profit: fin.currentRevenue - fin.totalExpenses,
              } as DropSummary
            } catch {
              return null
            }
          })
        )
        setDrops(summaries.filter(Boolean) as DropSummary[])
      })
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = drops.reduce((s, d) => s + d.currentRevenue, 0)
  const totalExpenses = drops.reduce((s, d) => s + d.totalExpenses, 0)
  const totalProfit = drops.reduce((s, d) => s + d.profit, 0)
  const totalPendingDebt = drops.reduce((s, d) => s + d.totalPendingDebt, 0)
  const totalCash = drops.reduce((s, d) => s + d.currentCash, 0)

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Resumen financiero</h1>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Ingresos totales</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Gastos totales</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalExpenses)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Ganancia neta</p>
          <p className={`text-xl font-semibold ${totalProfit >= 0 ? "text-[#00903c]" : "text-red-500"}`}>{fmt(totalProfit)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Deudas pendientes</p>
          <p className={`text-xl font-semibold ${totalPendingDebt > 0 ? "text-amber-600" : "text-gray-900"}`}>{fmt(totalPendingDebt)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-1">Caja total</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalCash)}</p>
        </div>
      </div>

      {/* Tabla de drops */}
      {drops.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <TrendingUp size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No hay drops con datos financieros</p>
          <Link href="/dashboard/drops/new" className="text-sm text-gray-600 underline mt-1 inline-block">Crear un drop</Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Drop", "Estado", "Ingresos", "Gastos", "Ganancia", "Deuda pendiente", "Caja", "Break-even", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drops.map((drop) => {
                const reachedBreakEven = drop.breakEvenPct !== null && (drop.soldPct * 100) >= drop.breakEvenPct
                return (
                  <tr key={drop.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{drop.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[drop.status]}`} />
                        <span className="text-xs text-gray-500">{STATUS_LABEL[drop.status]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{fmt(drop.currentRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(drop.totalExpenses)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${drop.profit >= 0 ? "text-[#00903c]" : "text-red-500"}`}>
                        {fmt(drop.profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {drop.totalPendingDebt > 0 ? (
                        <div className="flex items-center gap-1">
                          <AlertCircle size={12} className="text-amber-400" />
                          <span className="text-sm text-amber-600">{fmt(drop.totalPendingDebt)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {drop.currentCash > 0 ? fmt(drop.currentCash) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {drop.breakEvenPct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${reachedBreakEven ? "bg-[#00C46A]" : "bg-amber-400"}`}
                              style={{ width: `${Math.min((drop.soldPct / (drop.breakEvenPct / 100)) * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs ${reachedBreakEven ? "text-[#00903c]" : "text-gray-500"}`}>
                            {drop.breakEvenPct.toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/drops/${drop.id}/financials`} className="text-gray-300 hover:text-gray-600 transition-colors">
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
