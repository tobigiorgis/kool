"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Period = "1d" | "7d" | "30d" | "all"

interface Commission {
  id: string
  amount: number
  status: string
  createdAt: string
  conversion: {
    orderAmount: number
    link: {
      slug: string
      campaign: {
        id: string
        name: string
        workspace: { name: string; brandLogo: string | null; brandColor: string | null }
      } | null
    } | null
  } | null
}

interface EarningsData {
  commissions: Commission[]
  total: number
  pending: number
  paid: number
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  PAID: "Pagado",
  REJECTED: "Rechazado",
}
const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
}

export default function EarningsPage() {
  const [period, setPeriod] = useState<Period>("30d")
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/creator/earnings?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [period])

  const PERIODS: { key: Period; label: string }[] = [
    { key: "1d", label: "24h" },
    { key: "7d", label: "7 días" },
    { key: "30d", label: "30 días" },
    { key: "all", label: "Historia" },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Earnings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tus comisiones y pagos</p>
      </div>
      <div className="border-t border-gray-200" />

      {/* Period selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              period === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-[11px] text-gray-400 mb-1">Total</p>
              <p className="text-lg font-semibold text-gray-900 tracking-tight">{formatCurrency(data?.total ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-[11px] text-gray-400 mb-1">Pendiente</p>
              <p className="text-lg font-semibold text-amber-600 tracking-tight">{formatCurrency(data?.pending ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-[11px] text-gray-400 mb-1">Pagado</p>
              <p className="text-lg font-semibold text-green-600 tracking-tight">{formatCurrency(data?.paid ?? 0)}</p>
            </div>
          </div>

          {/* Commissions list */}
          {!data?.commissions.length ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-400">Sin ganancias en este período.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-3">Fecha</th>
                      <th className="text-left text-[11px] font-medium text-gray-400 px-4 py-3">Campaña</th>
                      <th className="text-right text-[11px] font-medium text-gray-400 px-4 py-3">Venta</th>
                      <th className="text-right text-[11px] font-medium text-gray-400 px-4 py-3">Comisión</th>
                      <th className="text-right text-[11px] font-medium text-gray-400 px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((c, i) => {
                      const campaign = c.conversion?.link?.campaign
                      return (
                        <tr key={c.id} className={`${i !== data.commissions.length - 1 ? "border-b border-gray-50" : ""}`}>
                          <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "2-digit" })}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-700 max-w-[120px] truncate">
                            {campaign ? (
                              <div>
                                <p className="font-medium truncate">{campaign.workspace.name}</p>
                                <p className="text-[11px] text-gray-400 truncate">{campaign.name}</p>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-700 text-right whitespace-nowrap">
                            {c.conversion ? formatCurrency(c.conversion.orderAmount) : "—"}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold text-gray-900 text-right whitespace-nowrap">
                            {formatCurrency(c.amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_CLS[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                              {STATUS_LABEL[c.status] ?? c.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
