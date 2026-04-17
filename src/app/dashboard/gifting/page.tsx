"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Package, Truck, CheckCircle, Clock, XCircle, RefreshCw, Search, X, Minus } from "lucide-react"

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

interface TiendanubeVariant {
  id: number
  price: string
  sku: string | null
  stock: number | null
}

interface TiendanubeProduct {
  id: number
  name: { es: string } | string
  variants: TiendanubeVariant[]
  images: { src: string }[]
}

interface SelectedProduct {
  variantId: number
  productId: number
  name: string
  variantName: string
  price: number
  quantity: number
  image: string | null
}

function productName(p: TiendanubeProduct): string {
  return typeof p.name === "object" ? p.name.es : p.name
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
  const [step, setStep] = useState<"creator" | "products" | "confirm">("creator")
  const [creators, setCreators] = useState<Creator[]>([])
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const [products, setProducts] = useState<TiendanubeProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selected, setSelected] = useState<SelectedProduct[]>([])
  const [search, setSearch] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/creators?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setCreators(d.creators ?? []))
      .catch(() => {})
  }, [workspaceId])

  const loadProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch(`/api/tiendanube/products?workspaceId=${workspaceId}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } finally {
      setProductsLoading(false)
    }
  }

  const goToProducts = () => {
    setStep("products")
    if (products.length === 0) loadProducts()
  }

  const addVariant = (product: TiendanubeProduct, variant: TiendanubeVariant) => {
    const key = variant.id
    const existing = selected.find((s) => s.variantId === key)
    if (existing) {
      setSelected((prev) => prev.map((s) => s.variantId === key ? { ...s, quantity: s.quantity + 1 } : s))
    } else {
      const name = productName(product)
      const variantName = product.variants.length > 1
        ? variant.sku || `Variante ${variant.id}`
        : ""
      setSelected((prev) => [...prev, {
        variantId: variant.id,
        productId: product.id,
        name,
        variantName,
        price: parseFloat(variant.price) || 0,
        quantity: 1,
        image: product.images[0]?.src ?? null,
      }])
    }
  }

  const updateQty = (variantId: number, delta: number) => {
    setSelected((prev) =>
      prev
        .map((s) => s.variantId === variantId ? { ...s, quantity: s.quantity + delta } : s)
        .filter((s) => s.quantity > 0)
    )
  }

  const filteredProducts = products.filter((p) =>
    productName(p).toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = selected.reduce((s, p) => s + p.price * p.quantity, 0)

  const handleSubmit = async () => {
    if (!selectedCreator || selected.length === 0) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/gifting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          creatorId: selectedCreator.id,
          products: selected.map((p) => ({
            variantId: p.variantId,
            productId: p.productId,
            name: p.variantName ? `${p.name} - ${p.variantName}` : p.name,
            quantity: p.quantity,
            value: p.price,
          })),
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al crear el gifting"); return }
      onCreated()
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nuevo gifting</h2>
            <div className="flex items-center gap-2 mt-1">
              {["creator", "products", "confirm"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    step === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {i + 1}. {s === "creator" ? "Creator" : s === "products" ? "Productos" : "Confirmar"}
                  </span>
                  {i < 2 && <span className="text-gray-200 text-xs">›</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Creator */}
        {step === "creator" && (
          <>
            <div className="flex-1 overflow-auto p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Seleccioná el creator</p>
              {creators.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={16} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {creators.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCreator(c)}
                      className={`w-full flex items-center gap-3 p-3 border rounded-xl text-left transition-colors ${
                        selectedCreator?.id === c.id
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {c.city ? `${c.address ?? "Sin número"}, ${c.city}` : "Sin dirección cargada"}
                        </p>
                      </div>
                      {!c.city && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                          Sin dirección
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={goToProducts}
                disabled={!selectedCreator || !selectedCreator.city}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Elegir productos →
              </button>
            </div>
          </>
        )}

        {/* Step 2: Products */}
        {step === "products" && (
          <>
            <div className="flex-1 overflow-auto flex flex-col min-h-0">
              {/* Search */}
              <div className="px-6 py-3 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
              </div>

              <div className="flex flex-1 min-h-0">
                {/* Product list */}
                <div className="flex-1 overflow-auto p-4 space-y-2">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw size={18} className="animate-spin text-gray-400" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No se encontraron productos.</p>
                  ) : (
                    filteredProducts.map((product) => (
                      <div key={product.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center gap-3 mb-2">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.images[0].src} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-gray-400" />
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-900">{productName(product)}</p>
                        </div>
                        <div className="space-y-1.5 pl-13">
                          {product.variants.map((variant) => {
                            const inCart = selected.find((s) => s.variantId === variant.id)
                            return (
                              <div key={variant.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  {product.variants.length > 1 && (
                                    <span className="text-xs text-gray-500">{variant.sku || `Var. ${variant.id}`}</span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-1">${parseFloat(variant.price).toLocaleString("es-AR")}</span>
                                  {variant.stock !== null && (
                                    <span className="text-[10px] text-gray-400 ml-1">({variant.stock} en stock)</span>
                                  )}
                                </div>
                                {inCart ? (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => updateQty(variant.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100">
                                      <Minus size={12} />
                                    </button>
                                    <span className="text-sm font-medium w-5 text-center">{inCart.quantity}</span>
                                    <button onClick={() => addVariant(product, variant)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100">
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addVariant(product, variant)}
                                    className="flex-shrink-0 text-[11px] font-medium text-gray-700 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-50"
                                  >
                                    + Agregar
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart sidebar */}
                {selected.length > 0 && (
                  <div className="w-52 border-l border-gray-100 p-4 flex flex-col gap-2 overflow-auto">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Seleccionados</p>
                    {selected.map((p) => (
                      <div key={p.variantId} className="text-xs">
                        <p className="font-medium text-gray-800 leading-tight">{p.name}</p>
                        {p.variantName && <p className="text-gray-400">{p.variantName}</p>}
                        <p className="text-gray-500">{p.quantity}x ${p.price.toLocaleString("es-AR")}</p>
                      </div>
                    ))}
                    <div className="mt-auto pt-2 border-t border-gray-100">
                      <p className="text-[11px] text-gray-400">Valor total</p>
                      <p className="text-sm font-semibold text-gray-900">${totalValue.toLocaleString("es-AR")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setStep("creator")} className="text-sm text-gray-500 hover:text-gray-700">
                ← Volver
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={selected.length === 0}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Confirmar ({selected.reduce((s, p) => s + p.quantity, 0)} items) →
              </button>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && selectedCreator && (
          <>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Creator</p>
                <p className="text-sm font-medium text-gray-900">{selectedCreator.name}</p>
                <p className="text-xs text-gray-400">{selectedCreator.address}, {selectedCreator.city}, {selectedCreator.province}</p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Productos</p>
                <div className="space-y-2">
                  {selected.map((p) => (
                    <div key={p.variantId} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {p.quantity}x {p.name}{p.variantName ? ` - ${p.variantName}` : ""}
                      </span>
                      <span className="text-gray-500 flex-shrink-0 ml-3">${(p.price * p.quantity).toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${totalValue.toLocaleString("es-AR")}</span>
                  </div>
                </div>
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
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => setStep("products")} className="text-sm text-gray-500 hover:text-gray-700">
                ← Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? "Creando orden..." : "Crear gifting en Tiendanube"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
