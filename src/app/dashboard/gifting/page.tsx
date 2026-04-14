"use client"

import { useState } from "react"
import { Plus, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; style: string }> = {
  PENDING:    { label: "Pendiente",  icon: <Clock size={12} />,        style: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "Procesando", icon: <Package size={12} />,      style: "bg-blue-100 text-blue-700" },
  SENT:       { label: "Enviado",    icon: <Truck size={12} />,         style: "bg-purple-100 text-purple-700" },
  DELIVERED:  { label: "Entregado",  icon: <Package size={12} />,      style: "bg-brand-100 text-brand-700" },
  CONFIRMED:  { label: "Confirmado", icon: <CheckCircle size={12} />,  style: "bg-green-100 text-green-700" },
  CANCELLED:  { label: "Cancelado",  icon: <XCircle size={12} />,      style: "bg-red-100 text-red-600" },
}

const MOCK_GIFTING = [
  {
    id: "1",
    creator: { name: "Camila Ruiz", email: "camila@email.com" },
    products: [{ name: "Vestido Floral - Talle M", quantity: 1 }, { name: "Cinturón Cuero", quantity: 1 }],
    totalValue: 18500,
    status: "SENT",
    trackingNumber: "OCA123456",
    createdAt: "2026-04-01",
    sentAt: "2026-04-03",
  },
  {
    id: "2",
    creator: { name: "Martina López", email: "marti@email.com" },
    products: [{ name: "Zapatillas Runner - Talle 38", quantity: 1 }],
    totalValue: 24000,
    status: "CONFIRMED",
    trackingNumber: "ANDES789012",
    createdAt: "2026-03-25",
    sentAt: "2026-03-27",
  },
  {
    id: "3",
    creator: { name: "Sofía Gómez", email: "sofi@email.com" },
    products: [{ name: "Set Skincare 3 pasos", quantity: 1 }],
    totalValue: 9800,
    status: "PENDING",
    trackingNumber: null,
    createdAt: "2026-04-12",
    sentAt: null,
  },
]

export default function GiftingPage() {
  const [showCreate, setShowCreate] = useState(false)

  const totalValue = MOCK_GIFTING.reduce((s, g) => s + g.totalValue, 0)
  const sent = MOCK_GIFTING.filter((g) => ["SENT", "DELIVERED", "CONFIRMED"].includes(g.status)).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gifting</h1>
          <p className="text-sm text-gray-500 mt-1">Enviá productos a tus creators directamente desde Tiendanube</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500"
        >
          <Plus size={16} />
          Nuevo gifting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total enviado</p>
          <p className="text-2xl font-semibold text-gray-900">{MOCK_GIFTING.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sent} confirmados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Valor total gifting</p>
          <p className="text-2xl font-semibold text-gray-900">${totalValue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">ARS este mes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Creators con gifting</p>
          <p className="text-2xl font-semibold text-gray-900">
            {new Set(MOCK_GIFTING.map((g) => g.creator.email)).size}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {MOCK_GIFTING.map((order) => {
          const statusConf = STATUS_CONFIG[order.status]
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
                      {order.products.map((p) => `${p.quantity}x ${p.name}`).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    ${order.totalValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.createdAt}
                  </p>
                </div>
              </div>
              {order.trackingNumber && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                  <Truck size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Tracking:</span>
                  <span className="text-xs font-mono font-medium text-gray-700">
                    {order.trackingNumber}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showCreate && <CreateGiftingModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateGiftingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"creator" | "products" | "confirm">("creator")
  const [selectedCreator, setSelectedCreator] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const MOCK_CREATORS_SIMPLE = [
    { id: "1", name: "Camila Ruiz", address: "Av. Santa Fe 1234, CABA" },
    { id: "2", name: "Martina López", address: "Corrientes 567, Rosario" },
    { id: "3", name: "Sofía Gómez", address: "Sin dirección cargada" },
  ]

  const handleSubmit = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nuevo gifting</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Se crea una orden en Tiendanube con precio $0 y se envía al creator.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Seleccioná el creator
            </label>
            <div className="space-y-2">
              {MOCK_CREATORS_SIMPLE.map((c) => (
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
                    <p className="text-xs text-gray-400">{c.address}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nota para el creator <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Esperamos que te encante el producto. Cualquier consulta, escribinos."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-700">
              <strong>Nota:</strong> Los productos se seleccionan del catálogo de tu tienda Tiendanube conectada.
              La orden se crea con precio $0 y aparece en tu panel de Tiendanube con el tag [KOOL GIFTING].
            </p>
          </div>
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
