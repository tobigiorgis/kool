"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, X, Link2, Check, ChevronRight, Search } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Sale { quantity: number; totalAmount: number }

interface DropProduct {
  id: string
  name: string
  sku: string | null
  image: string | null
  price: number
  unitCost: number
  initialStock: number
  tiendanubeProductId: string | null
  tiendanubeVariantId: string | null
  sales: Sale[]
}

interface AssignedProduct { id: string; name: string }
interface Assignment { dropProduct: AssignedProduct }

interface Expense {
  id: string
  amount: number
  currency: string
  date: string
  category: string
  notes: string | null
  scope: "DROP" | "PRODUCTS"
  assignments: Assignment[]
}

interface Drop {
  id: string
  name: string
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  launchDate: string
  closeDate: string | null
  description: string | null
  coverImage: string | null
  products: DropProduct[]
  expenses: Expense[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  CLOSED: "Cerrado",
}

const EXPENSE_CATEGORIES = [
  "MATERIA_PRIMA", "CONFECCION", "BORDADOS", "ESTAMPAS", "TRANSPORTE",
  "CORTE", "MERCADERIA", "INSUMOS", "FINISH", "AVIOS", "MOLDERIA",
  "PACKAGING", "SUELAS", "APLIQUES", "DEVOLUCIONES", "IMPORTACIONES", "OTROS",
]

const CATEGORY_LABEL: Record<string, string> = {
  MATERIA_PRIMA: "Materia prima", CONFECCION: "Confección", BORDADOS: "Bordados",
  ESTAMPAS: "Estampas", TRANSPORTE: "Transporte", CORTE: "Corte",
  MERCADERIA: "Mercadería", INSUMOS: "Insumos", FINISH: "Finish",
  AVIOS: "Avíos", MOLDERIA: "Moldería", PACKAGING: "Packaging",
  SUELAS: "Suelas", APLIQUES: "Apliques", DEVOLUCIONES: "Devoluciones",
  IMPORTACIONES: "Importaciones", OTROS: "Otros",
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n)
}

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DropDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dropId = params.id as string

  const [drop, setDrop] = useState<Drop | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [connectingProduct, setConnectingProduct] = useState<DropProduct | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/drops/${dropId}`)
      .then((r) => r.json())
      .then((d) => setDrop(d.drop))
      .finally(() => setLoading(false))
  }, [dropId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => setWorkspaceId(d.workspace?.id ?? null))
  }, [])

  const updateStatus = async (status: string) => {
    setUpdatingStatus(true)
    await fetch(`/api/drops/${dropId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setDrop((d) => d ? { ...d, status: status as Drop["status"] } : d)
    setUpdatingStatus(false)
  }

  const deleteExpense = async (expenseId: string) => {
    await fetch(`/api/drops/${dropId}/expenses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId }),
    })
    load()
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!drop) return <div className="p-8 text-sm text-gray-400">Drop no encontrado</div>

  // Métricas
  const totalUnitsSold = drop.products.reduce(
    (s, p) => s + p.sales.reduce((a, sale) => a + sale.quantity, 0), 0
  )
  const totalStock = drop.products.reduce((s, p) => s + p.initialStock, 0)
  const stockSoldPct = totalStock > 0 ? (totalUnitsSold / totalStock) * 100 : 0

  const totalRevenue = drop.products.reduce(
    (s, p) => s + p.sales.reduce((a, sale) => a + sale.totalAmount, 0), 0
  )
  const totalExpenses = drop.expenses.reduce((s, e) => s + e.amount, 0)
  const profit = totalRevenue - totalExpenses
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

  const launchDate = new Date(drop.launchDate)
  const daysSinceLaunch = Math.floor((Date.now() - launchDate.getTime()) / 86400000)

  // Top insights
  const productsWithMetrics = drop.products.map((p) => {
    const unitsSold = p.sales.reduce((s, sale) => s + sale.quantity, 0)
    const revenue = p.sales.reduce((s, sale) => s + sale.totalAmount, 0)
    const directCosts = p.unitCost * unitsSold
    const stockPct = p.initialStock > 0 ? (unitsSold / p.initialStock) * 100 : 0
    return { ...p, unitsSold, revenue, directCosts, stockPct }
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/drops" className="text-gray-400 hover:text-gray-600 mt-1 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{drop.name}</h1>
              <select
                value={drop.status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={updatingStatus}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 bg-white"
              >
                <option value="DRAFT">Borrador</option>
                <option value="ACTIVE">Activo</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Lanzamiento: {launchDate.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Avance del Drop", value: pct(stockSoldPct), sub: `${totalUnitsSold} / ${totalStock} unidades` },
          { label: "Ingresos", value: fmt(totalRevenue), sub: `${totalUnitsSold} unidades vendidas` },
          {
            label: "Rentabilidad",
            value: fmt(profit),
            sub: `Margen ${pct(margin)}`,
            highlight: profit >= 0 ? "text-[#00903c]" : "text-red-500",
          },
          { label: "Días desde lanzamiento", value: Math.max(0, daysSinceLaunch).toString(), sub: drop.closeDate ? `Cierra ${new Date(drop.closeDate).toLocaleDateString("es-AR")}` : "Sin fecha de cierre" },
        ].map(({ label, value, sub, highlight }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-semibold ${highlight || "text-gray-900"}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Productos */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Productos</h2>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Producto", "TN", "Stock", "Vendido", "Ingresos", "Costo unitario", "Margen est."].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productsWithMetrics.map((p) => {
                  const estimatedMargin = p.revenue > 0
                    ? ((p.revenue - p.directCosts) / p.revenue) * 100
                    : p.price > 0 ? ((p.price - p.unitCost) / p.price) * 100 : 0

                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-7 h-7 rounded object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-medium text-gray-400">{p.name.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-900">{p.name}</p>
                            {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.tiendanubeProductId ? (
                          <button
                            onClick={() => setConnectingProduct(p)}
                            className="flex items-center gap-1 text-xs text-[#00903c] bg-[#e6faf0] px-2 py-1 rounded-full hover:bg-[#d0f5e3] transition-colors"
                          >
                            <Check size={10} />
                            Conectado
                          </button>
                        ) : (
                          <button
                            onClick={() => setConnectingProduct(p)}
                            className="flex items-center gap-1 text-xs text-gray-400 border border-dashed border-gray-200 px-2 py-1 rounded-full hover:border-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Link2 size={10} />
                            Conectar
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.initialStock}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm text-gray-900">{p.unitsSold}</span>
                          <span className="text-xs text-gray-400 ml-1">({pct(p.stockPct)})</span>
                          <div className="w-20 h-1 bg-gray-100 rounded-full mt-1">
                            <div
                              className="h-1 bg-[#00C46A] rounded-full"
                              style={{ width: `${Math.min(p.stockPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{fmt(p.revenue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fmt(p.unitCost)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${estimatedMargin >= 30 ? "text-[#00903c]" : estimatedMargin >= 10 ? "text-amber-600" : "text-red-500"}`}>
                          {pct(estimatedMargin)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {productsWithMetrics.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      No hay productos en este Drop
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gastos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Gastos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Total: {fmt(totalExpenses)}</p>
          </div>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus size={13} />
            Agregar gasto
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Fecha", "Categoría", "Monto", "Asignación", "Notas", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drop.expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {CATEGORY_LABEL[expense.category] || expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(expense.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {expense.scope === "DROP"
                        ? "Todo el Drop"
                        : expense.assignments.map((a) => a.dropProduct.name).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{expense.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {drop.expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      No hay gastos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Insights */}
      {productsWithMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Más vendidos</h3>
            <div className="space-y-3">
              {[...productsWithMetrics]
                .sort((a, b) => b.unitsSold - a.unitsSold)
                .slice(0, 3)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                    <span className="text-sm font-medium text-gray-900">{p.unitsSold} u.</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Mayor rentabilidad est.</h3>
            <div className="space-y-3">
              {[...productsWithMetrics]
                .sort((a, b) => (b.revenue - b.directCosts) - (a.revenue - a.directCosts))
                .slice(0, 3)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                    <span className="text-sm font-medium text-[#00903c]">{fmt(p.revenue - p.directCosts)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal gasto */}
      {showExpenseModal && (
        <ExpenseModal
          dropId={dropId}
          products={drop.products}
          onClose={() => setShowExpenseModal(false)}
          onSaved={() => { setShowExpenseModal(false); load() }}
        />
      )}

      {/* Modal conectar con TN */}
      {connectingProduct && workspaceId && (
        <ConnectProductModal
          dropId={dropId}
          dropProduct={connectingProduct}
          workspaceId={workspaceId}
          onClose={() => setConnectingProduct(null)}
          onSaved={() => { setConnectingProduct(null); load() }}
        />
      )}
    </div>
  )
}

// ─── ExpenseModal ─────────────────────────────────────────────────────────────

function ExpenseModal({
  dropId,
  products,
  onClose,
  onSaved,
}: {
  dropId: string
  products: DropProduct[]
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [category, setCategory] = useState("OTROS")
  const [notes, setNotes] = useState("")
  const [scope, setScope] = useState<"DROP" | "PRODUCTS">("DROP")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !date) return
    setSaving(true)

    await fetch(`/api/drops/${dropId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(amount),
        date,
        category,
        notes: notes || undefined,
        scope,
        productIds: scope === "PRODUCTS" ? selectedProducts : undefined,
      }),
    })

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Agregar gasto</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Monto *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fecha *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A] bg-white"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Asignación</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="DROP"
                  checked={scope === "DROP"}
                  onChange={() => setScope("DROP")}
                  className="accent-[#00C46A]"
                />
                <span className="text-sm text-gray-700">Todo el Drop</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="PRODUCTS"
                  checked={scope === "PRODUCTS"}
                  onChange={() => setScope("PRODUCTS")}
                  className="accent-[#00C46A]"
                />
                <span className="text-sm text-gray-700">Productos específicos</span>
              </label>
            </div>

            {scope === "PRODUCTS" && (
              <div className="mt-3 space-y-2">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="accent-[#00C46A]"
                    />
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descripción opcional"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : "Guardar gasto"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ConnectProductModal ──────────────────────────────────────────────────────

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

function ConnectProductModal({
  dropId,
  dropProduct,
  workspaceId,
  onClose,
  onSaved,
}: {
  dropId: string
  dropProduct: DropProduct
  workspaceId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [tnProducts, setTnProducts] = useState<TiendanubeProduct[]>([])
  const [loadingTn, setLoadingTn] = useState(true)
  const [tnError, setTnError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<TiendanubeProduct | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<TiendanubeVariant | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/tiendanube/products?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setTnError(d.error)
        else setTnProducts(d.products || [])
      })
      .catch(() => setTnError("Error al cargar productos"))
      .finally(() => setLoadingTn(false))
  }, [workspaceId])

  const productName = (p: TiendanubeProduct) =>
    typeof p.name === "object" ? p.name.es || Object.values(p.name)[0] : p.name

  const filtered = tnProducts.filter((p) =>
    productName(p).toLowerCase().includes(search.toLowerCase())
  )

  const handleConnect = async () => {
    if (!selectedProduct) return
    const variant = selectedVariant ?? (selectedProduct.variants.length === 1 ? selectedProduct.variants[0] : null)

    setSaving(true)
    await fetch(`/api/drops/${dropId}/products/${dropProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tiendanubeProductId: selectedProduct.id.toString(),
        tiendanubeVariantId: variant ? variant.id.toString() : null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  const handleDisconnect = async () => {
    setSaving(true)
    await fetch(`/api/drops/${dropId}/products/${dropProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiendanubeProductId: null, tiendanubeVariantId: null }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Conectar con Tiendanube</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Producto Kool: <span className="text-gray-700">{dropProduct.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Ya conectado — info */}
        {dropProduct.tiendanubeProductId && (
          <div className="mx-5 mt-4 flex items-center justify-between p-3 bg-[#e6faf0] rounded-lg border border-[#b3efd4]">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-[#00903c]" />
              <span className="text-xs text-[#00903c] font-medium">Conectado a producto #{dropProduct.tiendanubeProductId}</span>
              {dropProduct.tiendanubeVariantId && (
                <span className="text-xs text-[#00903c]">/ variante #{dropProduct.tiendanubeVariantId}</span>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Desconectar
            </button>
          </div>
        )}

        {/* Step 1 — elegir producto TN */}
        {!selectedProduct ? (
          <>
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingTn ? (
                <div className="p-8 text-center">
                  <div className="text-sm text-gray-400 animate-pulse">Cargando productos de Tiendanube...</div>
                </div>
              ) : tnError ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-red-400">{tnError}</p>
                  <p className="text-xs text-gray-400 mt-1">Verificá que tu tienda Tiendanube esté conectada en Configuración</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  {search ? "No se encontraron productos" : "No hay productos en la tienda"}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setSelectedProduct(p)
                          // Si tiene una sola variante, preseleccionar
                          if (p.variants.length === 1) setSelectedVariant(p.variants[0])
                          else setSelectedVariant(null)
                        }}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        {p.images[0] ? (
                          <img src={p.images[0].src} alt={productName(p)} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-gray-400">{productName(p).charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{productName(p)}</p>
                          <p className="text-xs text-gray-400">
                            {p.variants.length} variante{p.variants.length !== 1 ? "s" : ""}
                            {p.variants[0]?.price && ` · $${parseFloat(p.variants[0].price).toLocaleString("es-AR")}`}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          /* Step 2 — elegir variante (si hay más de una) */
          <>
            <button
              onClick={() => { setSelectedProduct(null); setSelectedVariant(null) }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-5 pt-4"
            >
              <ArrowLeft size={12} />
              Volver
            </button>

            <div className="px-5 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-3">
                {selectedProduct.images[0] && (
                  <img src={selectedProduct.images[0].src} alt={productName(selectedProduct)} className="w-10 h-10 rounded object-cover" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{productName(selectedProduct)}</p>
                  <p className="text-xs text-gray-400">Seleccioná una variante</p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-4">
              {selectedProduct.variants.length === 1 ? (
                <div className="py-3 text-sm text-gray-500">
                  Producto sin variantes — se conectará directamente.
                </div>
              ) : (
                <ul className="space-y-2 mt-2">
                  {selectedProduct.variants.map((v) => (
                    <li key={v.id}>
                      <button
                        onClick={() => setSelectedVariant(v)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                          selectedVariant?.id === v.id
                            ? "border-[#00C46A] bg-[#e6faf0]"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <p className="text-sm text-gray-900">
                            {v.sku ? `SKU: ${v.sku}` : `Variante #${v.id}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            ${parseFloat(v.price).toLocaleString("es-AR")}
                            {v.stock !== null && ` · Stock: ${v.stock}`}
                          </p>
                        </div>
                        {selectedVariant?.id === v.id && (
                          <Check size={14} className="text-[#00903c]" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={handleConnect}
                disabled={saving || (selectedProduct.variants.length > 1 && !selectedVariant)}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Conectando..." : "Conectar producto"}
              </button>
              <button
                onClick={onClose}
                className="px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
