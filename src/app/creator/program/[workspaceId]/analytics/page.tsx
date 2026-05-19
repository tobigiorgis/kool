"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MousePointerClick, ShoppingCart, DollarSign } from "lucide-react"

interface AnalyticsData {
  clicks: number
  sales: number
  revenue: number
  links: {
    id: string
    slug: string
    destination: string
    clickCount: number
    saleCount: number
    revenue: number
  }[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function AnalyticsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/creator/programs/${workspaceId}/analytics`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workspaceId])

  const maxClicks = data ? Math.max(...data.links.map((l) => l.clickCount), 1) : 1

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rendimiento de tus links y ventas generadas.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                    <MousePointerClick size={14} className="text-gray-500" />
                  </div>
                  <span className="text-xs text-gray-500">Clics</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.clicks.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                    <ShoppingCart size={14} className="text-gray-500" />
                  </div>
                  <span className="text-xs text-gray-500">Ventas</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{data.sales}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                    <DollarSign size={14} className="text-gray-500" />
                  </div>
                  <span className="text-xs text-gray-500">Revenue</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(data.revenue)}
                </p>
              </div>
            </div>

            {/* Top links */}
            {data.links.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Top links</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">
                          Link
                        </th>
                        <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">
                          Clics
                        </th>
                        <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">
                          Ventas
                        </th>
                        <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.links.map((link) => (
                        <tr key={link.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-6 py-3">
                            <div>
                              <p className="text-sm font-mono text-gray-700 text-xs">
                                kool.link/{link.slug}
                              </p>
                              <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-48">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(link.clickCount / maxClicks) * 100}%`,
                                    backgroundColor: "#F8BBD0",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 text-right">
                            {link.clickCount.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 text-right">
                            {link.saleCount}
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(link.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">No hay datos disponibles.</p>
          </div>
        )}
      </div>
    </div>
  )
}
