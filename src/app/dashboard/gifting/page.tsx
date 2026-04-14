"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Package, Truck, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react"

interface GiftingOrder {
  id: string
  totalValue: number
  status: string
  notes: string | null
  trackingNumber: string | null
  createdAt: string
  sentAt: string | null
  products: { name: string; quantity: number }[]
  creator: { id: string; name: string; email: string }
}

interface Creator {
  id: string
  name: string
  address: string | null
  city: string | null
  province: string | null
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; style: string }> = {
  PENDING:    { label: "Pendiente",  icon: <Clock size={12} />,        style: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "Procesando", icon: <Package size={12} />,      style: "bg-blue-100 text-blue-700" },
  SENT:       { label: "Enviado",    icon: <Truck size={12} />,         style: "bg-purple-100 text-purple-700" },
  DELIVERED:  { label: "Entregado",  icon: <Package size={12} />,       style: "bg-brand-100 text-brand-700" },
  CONFIRMED:  { label: "Confirmado", icon: <CheckCircle size={12} />,   style: "bg-green-100 text-green-700" },
  CANCELLED:  { label: "Cancelado",  icon: <XCircle size={12} />,       style: "bg-red-100 text-red-600" },
}

export default function GiftingPage() {
  const [orders, setOrders] = useState<GiftingOrder[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [hasTiendanube, setHasTiendanube] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await fetch("/api/workspace/me")
      if (!wsRes.ok) return
      const { workspace } = await wsRes.json()
      if (!workspace) return

      setWorkspaceId(workspace.id)
      setHasTiendanube(!!workspace.tiendanubeConnection?.active)

      const res = await fetch(`/api/gifting?workspaceId=${workspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.giftingOrders)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalValue = orders.reduce((s, o) => s + o.totalValue, 0)
  const confirmed = orders.filter((o) => ["CONFIRMED", "DELIVERED"].includes(o.status)).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gifting</h1>
          <p className="text-sm text-gray-500 mt-1">Enviá productos a tus creators desde Tiendanube</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!hasTiendanube}
          title={!hasTiendanube ? "Conectá Tiendanube primero" : undefined}
          className="flex items-center gap-2 bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Nuevo gifting
        </button>
      </div>

      {!hasTiendanube && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-amber-800">
            Conectá tu tienda Tiendanube para crear órdenes de gifting.
          </p>
          <a
            href="/dashboard/settings?tab=integrations"
            className="text-xs font-medium text-amber-700 hover:underline ml-4 flex-shrink-0"
          >
            Conectar →
          </a>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total enviado</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : orders.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{confirmed} confirmados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Valor total</p>
          <p className="text-2xl font-semibold text-gray-900">
            {loading ? "—" : `$${totalValue.toLocaleString("es-AR")}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">ARS</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Creators con gifting</p>
          <p className="text-2xl font-semibold text-gray-900">
            {loading ? "—" : new Set(orders.map((o) => o.creator.id)).size}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw size={20} className="animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Package size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Todavía no creaste ningún gifting.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
            const products = Array.isArray(order.products)
              ? (order.products as { name: string; quantity: number }[])
              : []
            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                      <Package size={18} className="text-brand-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{order.creator.name}</p>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.style}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {products.map((p) => `${p.quantity}x ${p.name}`).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      ${order.totalValue.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>
                {order.trackingNumber && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                    <Truck size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Tracking:</span>
                    <span className="text-xs font-mono font-medium text-gray-700">{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && workspaceId && (
        <CreateGiftingModal
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

function CreateGiftingModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [creators, setCreators] = useState<Creator[]>([])
  const [selectedCreator, setSelectedCreator] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/creators?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setCreators(d.creators ?? []))
      .catch(() => {})
  }, [workspaceId])

  const handleSubmit = async () => {
    if (!selectedCreator) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/gifting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          creatorId: selectedCreator,
          products: [{ variantId: 0, productId: 0, name: "Gifting manual", quantity: 1, value: 0 }],
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear el gifting")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nuevo gifting</h2>
          <p className="text-xs text-gray-500 mt-0.5">Se crea una orden en Tiendanube con precio $0.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Seleccioná el creator</label>
            {creators.length === 0 ? (
              <p className="text-xs text-gray-400">Cargando creators...</p>
            ) : (
              <div className="space-y-2">
                {creators.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCreator === c.id
                        ? "border-brand-400 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="creator"
                      value={c.id}
                      checked={selectedCreator === c.id}
                      onChange={() => setSelectedCreator(c.id)}
                      className="text-brand-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.city ? `${c.address ?? "Sin dirección"}, ${c.city}` : "Sin dirección cargada"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nota para el creator <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Esperamos que te encante el producto..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCreator || loading}
            className="flex-1 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
          >
            {loading ? "Creando orden..." : "Crear gifting"}
          </button>
        </div>
      </div>
    </div>
  )
}
