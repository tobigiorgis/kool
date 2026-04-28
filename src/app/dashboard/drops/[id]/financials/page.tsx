"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Check, AlertCircle, X } from "lucide-react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DebtItem {
  id: string
  sourceId: string
  sourceType: "expense" | "debt"
  description: string
  amount: number
  currency: string
  creditor: string | null
  dueDate: string | null
  paidAt: string | null
  notes: string | null
}

interface Forecast {
  salesPct: number
  projectedUnits: number
  projectedRevenue: number
  projectedProfit: number
  projectedMargin: number
}

interface DropFinancials {
  currentRevenue: number
  totalStock: number
  totalSold: number
  soldPct: number
  totalExpenses: number
  totalPendingDebt: number
  allDebts: DebtItem[]
  currentCash: number
  maxRevenue: number
  breakEvenUnits: number | null
  breakEvenRevenue: number | null
  breakEvenPct: number | null
  forecasts: Forecast[]
  expensesByCategory: Record<string, number>
  products: { id: string; name: string; price: number; unitCost: number; initialStock: number }[]
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// ─── AddDebtModal ─────────────────────────────────────────────────────────────

function AddDebtModal({ dropId, onClose, onSaved }: { dropId: string; onClose: () => void; onSaved: () => void }) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [creditor, setCreditor] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount) return
    setSaving(true)
    await fetch(`/api/drops/${dropId}/debts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        amount: parseFloat(amount),
        creditor: creditor || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Agregar deuda</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Descripción *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Saldo pendiente taller" required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Monto *</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fecha límite</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Acreedor</label>
            <input type="text" value={creditor} onChange={(e) => setCreditor(e.target.value)} placeholder="Ej: Taller San Martín"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A] resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving || !description || !amount}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? "Guardando..." : "Agregar deuda"}
            </button>
            <button type="button" onClick={onClose} className="px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DropFinancialsPage() {
  const params = useParams()
  const dropId = params.id as string

  const [data, setData] = useState<DropFinancials | null>(null)
  const [loading, setLoading] = useState(true)
  const [cashInput, setCashInput] = useState("")
  const [savingCash, setSavingCash] = useState(false)
  const [forecastSlider, setForecastSlider] = useState(50)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [togglingDebt, setTogglingDebt] = useState<string | null>(null)

  const load = () => {
    fetch(`/api/drops/${dropId}/financials`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setCashInput(d.currentCash > 0 ? String(d.currentCash) : "")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [dropId])

  const handleSaveCash = async () => {
    setSavingCash(true)
    await fetch(`/api/drops/${dropId}/cash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(cashInput) || 0 }),
    })
    setSavingCash(false)
    load()
  }

  const handleToggleDebt = async (debt: DebtItem) => {
    setTogglingDebt(debt.id)
    const isPaid = !debt.paidAt
    if (debt.sourceType === "expense") {
      await fetch(`/api/drops/${dropId}/expenses/${debt.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: isPaid }),
      })
    } else {
      await fetch(`/api/drops/${dropId}/debts/${debt.sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: isPaid }),
      })
    }
    setTogglingDebt(null)
    load()
  }

  const handleDeleteDebt = async (debt: DebtItem) => {
    if (debt.sourceType !== "debt") return
    await fetch(`/api/drops/${dropId}/debts/${debt.sourceId}`, { method: "DELETE" })
    load()
  }

  // Real-time forecast from slider
  const forecast = useMemo(() => {
    if (!data) return null
    const pct = forecastSlider / 100
    const projectedRevenue = data.products.reduce((sum, p) => sum + p.price * Math.round(p.initialStock * pct), 0)
    const projectedDirectCosts = data.products.reduce((sum, p) => sum + p.unitCost * Math.round(p.initialStock * pct), 0)
    const projectedProfit = projectedRevenue - projectedDirectCosts - data.totalExpenses
    const projectedMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0
    const projectedUnits = Math.round(data.totalStock * pct)
    return { projectedRevenue, projectedDirectCosts, projectedProfit, projectedMargin, projectedUnits }
  }, [data, forecastSlider])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/4" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-36 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-sm text-gray-400">No se pudo cargar</div>

  const pendingDebts = data.allDebts.filter((d) => !d.paidAt)
  const paidDebts = data.allDebts.filter((d) => d.paidAt)

  const profitColor = forecast
    ? forecast.projectedProfit >= 0 ? "text-[#00903c]" : "text-red-500"
    : "text-gray-900"

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/drops/${dropId}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Financiero del Drop</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── Bloque 1: Caja ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Caja actual</h2>
          <p className="text-xs text-gray-400 mb-4">Dinero disponible en caja al día de hoy</p>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
              />
            </div>
            <button
              onClick={handleSaveCash}
              disabled={savingCash}
              className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {savingCash ? "..." : "Guardar"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Ingresos cobrados</p>
              <p className="text-base font-semibold text-gray-900">{fmt(data.currentRevenue)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Deuda pendiente</p>
              <p className={`text-base font-semibold ${data.totalPendingDebt > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {fmt(data.totalPendingDebt)}
              </p>
            </div>
          </div>

          {data.totalPendingDebt > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Caja neta estimada: <span className="font-medium">{fmt(data.currentCash - data.totalPendingDebt)}</span> al pagar todas las deudas
              </p>
            </div>
          )}
        </div>

        {/* ── Bloque 2: Deudas ───────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900">Deudas</h2>
            <button
              onClick={() => setShowAddDebt(true)}
              className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus size={12} />
              Agregar
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {pendingDebts.length === 0 ? "Sin deudas pendientes" : `${pendingDebts.length} pendiente${pendingDebts.length !== 1 ? "s" : ""} · ${fmt(data.totalPendingDebt)}`}
          </p>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
            {data.allDebts.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">No hay deudas registradas</p>
            )}
            {pendingDebts.map((debt) => {
              const overdue = isOverdue(debt.dueDate)
              return (
                <div key={debt.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${overdue ? "border-red-100 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                  <button
                    onClick={() => handleToggleDebt(debt)}
                    disabled={togglingDebt === debt.id}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      togglingDebt === debt.id ? "opacity-50" : "border-gray-300 hover:border-[#00C46A]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{debt.description}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={`text-xs font-medium ${overdue ? "text-red-600" : "text-gray-700"}`}>{fmt(debt.amount)}</span>
                      {debt.creditor && <span className="text-xs text-gray-400">{debt.creditor}</span>}
                      {debt.dueDate && (
                        <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                          {overdue ? "Vencida " : "Vence "}{fmtDate(debt.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  {debt.sourceType === "debt" && (
                    <button onClick={() => handleDeleteDebt(debt)} className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )
            })}
            {paidDebts.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-2">Pagadas</p>
                {paidDebts.map((debt) => (
                  <div key={debt.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 opacity-50 mb-2">
                    <button
                      onClick={() => handleToggleDebt(debt)}
                      disabled={togglingDebt === debt.id}
                      className="mt-0.5 w-4 h-4 rounded border border-[#00C46A] bg-[#00C46A] flex items-center justify-center flex-shrink-0"
                    >
                      <Check size={10} className="text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 line-through truncate">{debt.description}</p>
                      <span className="text-xs text-gray-400">{fmt(debt.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Bloque 3: Pronóstico interactivo ──────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Pronóstico interactivo</h2>
          <p className="text-xs text-gray-400 mb-5">¿Qué pasa si vendés el {forecastSlider}% del stock?</p>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">% de stock vendido</span>
              <span className="text-sm font-semibold text-gray-900">{forecastSlider}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={forecastSlider}
              onChange={(e) => setForecastSlider(parseInt(e.target.value))}
              className="w-full accent-[#00C46A]"
            />
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {forecast && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Ingresos proyectados</p>
                <p className="text-base font-semibold text-gray-900">{fmt(forecast.projectedRevenue)}</p>
                <p className="text-xs text-gray-400">{forecast.projectedUnits} u. vendidas</p>
              </div>
              <div className={`rounded-lg p-3 ${forecast.projectedProfit >= 0 ? "bg-[#e6faf0]" : "bg-red-50"}`}>
                <p className="text-xs text-gray-400 mb-0.5">Ganancia neta</p>
                <p className={`text-base font-semibold ${profitColor}`}>{fmt(forecast.projectedProfit)}</p>
                <p className={`text-xs ${forecast.projectedProfit >= 0 ? "text-[#00903c]" : "text-red-400"}`}>
                  Margen {forecast.projectedMargin.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Costos directos</p>
                <p className="text-base font-semibold text-gray-900">{fmt(forecast.projectedDirectCosts)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Gastos del drop</p>
                <p className="text-base font-semibold text-gray-900">{fmt(data.totalExpenses)}</p>
              </div>
            </div>
          )}

          {/* Progress vs actual */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Ventas actuales</span>
              <span className="text-xs text-gray-500">{(data.soldPct * 100).toFixed(0)}% vendido</span>
            </div>
            <div className="relative w-full h-2 bg-gray-100 rounded-full">
              <div className="h-2 rounded-full bg-[#00C46A]" style={{ width: `${data.soldPct * 100}%` }} />
              <div
                className="absolute top-0 w-0.5 h-2 bg-gray-900"
                style={{ left: `${forecastSlider}%`, transform: "translateX(-50%)" }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>Actual: {fmt(data.currentRevenue)}</span>
              <span>Pronóstico: {forecast ? fmt(forecast.projectedRevenue) : "—"}</span>
            </div>
          </div>
        </div>

        {/* ── Bloque 4: Punto de equilibrio ────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Punto de equilibrio</h2>
          <p className="text-xs text-gray-400 mb-5">Mínimo de ventas para cubrir todos los gastos</p>

          {data.breakEvenUnits === null ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">No se puede calcular — el margen por unidad es 0. Verificá que los productos tengan precio y costo cargados.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Unidades</p>
                  <p className="text-xl font-bold text-gray-900">{data.breakEvenUnits}</p>
                  <p className="text-xs text-gray-400">de {data.totalStock}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Ingresos</p>
                  <p className="text-sm font-bold text-gray-900">{fmt(data.breakEvenRevenue!)}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${(data.soldPct * 100) >= data.breakEvenPct! ? "bg-[#e6faf0]" : "bg-gray-50"}`}>
                  <p className="text-xs text-gray-400 mb-1">% del stock</p>
                  <p className={`text-xl font-bold ${(data.soldPct * 100) >= data.breakEvenPct! ? "text-[#00903c]" : "text-gray-900"}`}>
                    {data.breakEvenPct!.toFixed(0)}%
                  </p>
                  {(data.soldPct * 100) >= data.breakEvenPct! && (
                    <p className="text-xs text-[#00903c] font-medium">Superado</p>
                  )}
                </div>
              </div>

              {/* Barra de progreso hacia break-even */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Progreso hacia el equilibrio</span>
                  <span className="text-xs font-medium text-gray-700">
                    {Math.min((data.soldPct / (data.breakEvenPct! / 100)) * 100, 100).toFixed(0)}%
                  </span>
                </div>
                <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all ${(data.soldPct * 100) >= data.breakEvenPct! ? "bg-[#00C46A]" : "bg-amber-400"}`}
                    style={{ width: `${Math.min((data.soldPct / (data.breakEvenPct! / 100)) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Vendido: {fmt(data.currentRevenue)}</span>
                  <span>Objetivo: {fmt(data.breakEvenRevenue!)}</span>
                </div>
              </div>

              {/* Gastos detallados */}
              {Object.keys(data.expensesByCategory).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Gastos por categoría</p>
                  <div className="space-y-1.5">
                    {Object.entries(data.expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amount]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{cat.charAt(0) + cat.slice(1).toLowerCase().replace(/_/g, " ")}</span>
                          <span className="text-xs font-medium text-gray-700">{fmt(amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAddDebt && (
        <AddDebtModal
          dropId={dropId}
          onClose={() => setShowAddDebt(false)}
          onSaved={() => { setShowAddDebt(false); load() }}
        />
      )}
    </div>
  )
}
