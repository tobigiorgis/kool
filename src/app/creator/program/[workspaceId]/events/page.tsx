"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface EventItem {
  id: string
  type: "click" | "sale"
  linkSlug: string | null
  date: string
  orderId?: string
  amount?: number
}

type EventType = "click" | "sale"

function formatDate(d: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d))
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function EventsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const [eventType, setEventType] = useState<EventType>("sale")
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/creator/programs/${workspaceId}/events?type=${eventType}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workspaceId, eventType])

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Eventos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Historial de clics y ventas en tiempo real.
            </p>
          </div>
          {/* Toggle */}
          <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1">
            {(["sale", "click"] as EventType[]).map((t) => (
              <button
                key={t}
                onClick={() => setEventType(t)}
                className={`text-xs px-4 py-1.5 rounded-lg transition-colors ${
                  eventType === t
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t === "sale" ? "Ventas" : "Clics"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">
              No hay {eventType === "sale" ? "ventas" : "clics"} registrados.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Tipo</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Link</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Fecha</th>
                  {eventType === "sale" && (
                    <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">
                      Monto
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          e.type === "sale"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {e.type === "sale" ? "Venta" : "Clic"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-mono text-gray-600">
                      {e.linkSlug ? `kool.link/${e.linkSlug}` : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{formatDate(e.date)}</td>
                    {eventType === "sale" && (
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                        {e.amount != null ? formatCurrency(e.amount) : "—"}
                      </td>
                    )}
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
