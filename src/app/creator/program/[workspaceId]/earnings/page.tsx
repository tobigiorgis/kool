"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Commission {
  id: string
  amount: number
  orderAmount: number
  percentage: number
  status: string
  createdAt: string
}

type Period = "30d" | "90d" | "all"

const PERIODS: { label: string; value: Period }[] = [
  { label: "Últimos 30 días", value: "30d" },
  { label: "Últimos 90 días", value: "90d" },
  { label: "Todo el tiempo", value: "all" },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Pendiente", cls: "bg-yellow-50 text-yellow-700" },
    APPROVED: { label: "Aprobada", cls: "bg-green-50 text-green-700" },
    PAID: { label: "Pagada", cls: "bg-blue-50 text-blue-700" },
    REJECTED: { label: "Rechazada", cls: "bg-red-50 text-red-700" },
  }
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" }
  return (
    <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d))
}

export default function EarningsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const [period, setPeriod] = useState<Period>("30d")
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/creator/programs/${workspaceId}/earnings?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setCommissions(d.commissions ?? [])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workspaceId, period])

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ganancias</h1>
            <p className="text-sm text-gray-500 mt-1">
              Historial de comisiones por ventas generadas.
            </p>
          </div>
          {/* Period filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  period === p.value
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <p className="text-xs text-gray-500 mb-1">Total ganancias</p>
          <p className="text-3xl font-semibold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {commissions.length} comisiones en el período seleccionado
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : commissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">No hay comisiones en este período.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Fecha</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Tipo</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Estado</th>
                  <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">Venta</th>
                  <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(c.createdAt)}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                        Venta
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 text-right">
                      {formatCurrency(c.orderAmount)}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(c.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
