"use client"

import { useState, useEffect, useCallback, use } from "react"
import { Tag, Plus, Pencil, Trash2, TrendingUp, TrendingDown, ShoppingBag, DollarSign, Calendar, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface DropProduct {
  id: string
  name: string
  price: number
  image: string | null
}

interface DropSaleProduct {
  id: string
  dropProductId: string
  discountPct: number
  originalPrice: number
  salePrice: number
  dropProduct: DropProduct
}

interface DropSale {
  id: string
  name: string
  startDate: string
  endDate: string
  generalDiscountPct: number | null
  status: string
  notes: string | null
  productDiscounts: DropSaleProduct[]
}

interface SaleStats {
  sale: DropSale
  realStatus: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED"
  unitsSoldDuring: number
  revenueDuring: number
  unitsSoldBefore: number
  revenueBefore: number
  revenueLostToDiscount: number
  daysActive: number
  avgDailyRevenue: number
  byProduct: Record<string, { units: number; revenue: number }>
}

const STATUS_CONFIG = {
  SCHEDULED: { label: "Programado", className: "bg-blue-100 text-blue-700" },
  ACTIVE:    { label: "Activo",      className: "bg-green-100 text-green-700" },
  ENDED:     { label: "Finalizado",  className: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelado",   className: "bg-red-100 text-red-600" },
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)

export default function DropSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: dropId } = use(params)
  const [stats, setStats] = useState<SaleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [products, setProducts] = useState<DropProduct[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, dropRes] = await Promise.all([
        fetch(`/api/drops/${dropId}/sale`),
        fetch(`/api/drops/${dropId}`),
      ])
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      } else {
        setStats(null)
      }
      if (dropRes.ok) {
        const data = await dropRes.json()
        setProducts(data.drop?.products ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [dropId])

  useEffect(() => { load() }, [load])

  const cancelSale = async () => {
    if (!confirm("¿Cancelar el sale? Se puede reactivar después.")) return
    await fetch(`/api/drops/${dropId}/sale`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    })
    load()
  }

  const deleteSale = async () => {
    if (!confirm("¿Eliminar el sale permanentemente? Esta acción no se puede deshacer.")) return
    await fetch(`/api/drops/${dropId}/sale`, { method: "DELETE" })
    setStats(null)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Tag size={20} className="text-brand-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Creá un sale para este Drop</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Aplicá descuentos generales o por producto durante un período y trackeá el impacto en ventas.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand-400 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-500"
          >
            <span className="flex items-center gap-2"><Plus size={14} /> Crear sale</span>
          </button>
        </div>

        {showCreate && (
          <SaleModal
            dropId={dropId}
            products={products}
            onClose={() => setShowCreate(false)}
            onSaved={() => { setShowCreate(false); load() }}
          />
        )}
      </div>
    )
  }

  const { sale, realStatus } = stats
  const statusCfg = STATUS_CONFIG[realStatus]
  const hasGeneral = !!sale.generalDiscountPct
  const hasProductDiscounts = sale.productDiscounts.length > 0

  return (
    <div className="p-6 space-y-5">
      {/* Header del sale */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <Tag size={18} className="text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">{sale.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <Calendar size={11} />
                {new Date(sale.startDate).toLocaleDateString("es-AR")} —{" "}
                {new Date(sale.endDate).toLocaleDateString("es-AR")}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {hasGeneral
                  ? `Descuento general: ${sale.generalDiscountPct}% en todos los productos`
                  : `Descuentos individuales por producto`}
              </p>
              {sale.notes && <p className="text-xs text-gray-400 mt-1 italic">{sale.notes}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            {realStatus !== "CANCELLED" && (
              <button
                onClick={cancelSale}
                className="text-xs text-orange-500 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-50 transition-colors"
              >
                Cancelar sale
              </button>
            )}
            <button
              onClick={deleteSale}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Los precios del sale son solo para tracking en Kool. Para aplicarlos en tu tienda, actualizalos manualmente en Tiendanube.
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Unidades en sale"
          value={stats.unitsSoldDuring.toString()}
          icon={<ShoppingBag size={16} className="text-brand-500" />}
        />
        <MetricCard
          label="Revenue en sale"
          value={fmt(stats.revenueDuring)}
          icon={<DollarSign size={16} className="text-brand-500" />}
        />
        <MetricCard
          label="Descuento otorgado"
          value={fmt(stats.revenueLostToDiscount)}
          icon={<TrendingDown size={16} className="text-orange-500" />}
          sub="vs precio normal"
        />
        <MetricCard
          label="Promedio diario"
          value={stats.daysActive > 0 ? fmt(stats.avgDailyRevenue) : "—"}
          icon={<TrendingUp size={16} className="text-brand-500" />}
          sub={stats.daysActive > 0 ? `${stats.daysActive} días activo` : "Aún no empezó"}
        />
      </div>

      {/* Comparativa pre vs durante */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Comparativa</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Antes del sale</p>
            <p className="text-xl font-semibold text-gray-900">{fmt(stats.revenueBefore)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stats.unitsSoldBefore} unidades</p>
          </div>
          <div className="p-4 bg-brand-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Durante el sale</p>
            <p className="text-xl font-semibold text-brand-700">{fmt(stats.revenueDuring)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stats.unitsSoldDuring} unidades</p>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      {(hasGeneral || hasProductDiscounts) && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Productos en sale</h3>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Producto</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Precio normal</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Descuento</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Precio sale</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Vendidos en sale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => {
                  const pd = sale.productDiscounts.find((d) => d.dropProductId === p.id)
                  const discountPct = pd?.discountPct ?? sale.generalDiscountPct ?? 0
                  const salePrice = pd?.salePrice ?? (p.price * (1 - discountPct / 100))
                  const sold = stats.byProduct[p.id]

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.image && <img src={p.image} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                          <span className="text-sm text-gray-900 font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">{fmt(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        {discountPct > 0 ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            -{discountPct}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sin descuento</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-brand-600">
                        {discountPct > 0 ? fmt(salePrice) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {sold ? `${sold.units} u.` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showEdit && (
        <SaleModal
          dropId={dropId}
          products={products}
          existing={sale}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}
    </div>
  )
}

function MetricCard({
  label, value, icon, sub,
}: {
  label: string; value: string; icon: React.ReactNode; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">{icon}</div>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
// Modal crear / editar sale
// ─────────────────────────────────────────────

type DiscountMode = "general" | "per-product"

function SaleModal({
  dropId,
  products,
  existing,
  onClose,
  onSaved,
}: {
  dropId: string
  products: DropProduct[]
  existing?: DropSale
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!existing

  const [step, setStep] = useState(isEdit ? 2 : 1)
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    startDate: existing?.startDate ? existing.startDate.slice(0, 10) : "",
    endDate: existing?.endDate ? existing.endDate.slice(0, 10) : "",
    notes: existing?.notes ?? "",
  })
  const [mode, setMode] = useState<DiscountMode>(
    existing?.generalDiscountPct != null ? "general" : "per-product"
  )
  const [generalPct, setGeneralPct] = useState(existing?.generalDiscountPct?.toString() ?? "")
  const [productDiscounts, setProductDiscounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    existing?.productDiscounts?.forEach((pd) => {
      map[pd.dropProductId] = pd.discountPct.toString()
    })
    return map
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const setDiscount = (productId: string, val: string) =>
    setProductDiscounts((prev) => ({ ...prev, [productId]: val }))

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      setError("Completá nombre y fechas"); return
    }
    setLoading(true); setError("")

    const payload = {
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes || null,
      generalDiscountPct: mode === "general" && generalPct ? parseFloat(generalPct) : null,
      productDiscounts: mode === "per-product"
        ? products
            .filter((p) => productDiscounts[p.id])
            .map((p) => ({ dropProductId: p.id, discountPct: parseFloat(productDiscounts[p.id]) }))
        : [],
    }

    try {
      const res = await fetch(`/api/drops/${dropId}/sale`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return }
      onSaved()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const genPct = parseFloat(generalPct) || 0

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? "Editar sale" : "Nuevo sale"}
            </h2>
            {!isEdit && (
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1 w-8 rounded-full transition-colors ${s <= step ? "bg-brand-400" : "bg-gray-200"}`}
                  />
                ))}
                <span className="text-xs text-gray-400 ml-1">Paso {step} de 3</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Paso 1 — Info básica */}
          {(step === 1 || isEdit) && (
            <div className="space-y-4">
              {isEdit && <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Información del sale</p>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre del sale *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Mid-season sale, Black Friday..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Inicio *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Fin *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Campaña de liquidación..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>
          )}

          {/* Paso 2 — Tipo de descuento */}
          {(step === 2 || isEdit) && (
            <div className="space-y-4">
              {isEdit && <div className="border-t border-gray-100 pt-4"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descuentos</p></div>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Tipo de descuento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["general", "per-product"] as DiscountMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-colors ${
                        mode === m
                          ? "border-brand-400 bg-brand-50 text-brand-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {m === "general" ? "⚪ Descuento general" : "⚪ Por producto"}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "general" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Descuento para todos los productos</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={generalPct}
                      onChange={(e) => setGeneralPct(e.target.value)}
                      min={0} max={100}
                      placeholder="20"
                      className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 text-right"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  {genPct > 0 && products.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-gray-400">Preview de precios:</p>
                      {products.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="truncate max-w-[160px]">{p.name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="line-through text-gray-400">{fmt(p.price)}</span>
                            <span className="font-semibold text-brand-600">{fmt(p.price * (1 - genPct / 100))}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mode === "per-product" && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Dejá en 0 o vacío para no aplicar descuento al producto</p>
                  {products.map((p) => {
                    const pct = parseFloat(productDiscounts[p.id] || "0") || 0
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        {p.image && <img src={p.image} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{fmt(p.price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            value={productDiscounts[p.id] ?? ""}
                            onChange={(e) => setDiscount(p.id, e.target.value)}
                            placeholder="0"
                            min={0} max={100}
                            className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-brand-400"
                          />
                          <span className="text-sm text-gray-400">%</span>
                        </div>
                        <div className="w-20 text-right shrink-0">
                          {pct > 0 ? (
                            <p className="text-sm font-semibold text-brand-600">{fmt(p.price * (1 - pct / 100))}</p>
                          ) : (
                            <p className="text-sm text-gray-300">—</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Paso 3 — Confirmación */}
          {step === 3 && !isEdit && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Resumen del sale</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Nombre</span><span className="font-medium">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Inicio</span><span>{form.startDate}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Fin</span><span>{form.endDate}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Descuento</span>
                  <span>
                    {mode === "general"
                      ? `${generalPct}% general`
                      : `${Object.values(productDiscounts).filter(Boolean).length} productos con descuento`}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Estos precios son solo para tracking en Kool. Para aplicarlos en tu tienda, actualizalos manualmente en Tiendanube.
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <div className="flex-1 flex gap-2 justify-end">
            {!isEdit && step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Atrás
              </button>
            )}
            {!isEdit && step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && (!form.name || !form.startDate || !form.endDate)}
                className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear sale"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
