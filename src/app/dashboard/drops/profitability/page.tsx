"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

// ─── Types ───────────────────────────────────────────────────────────────────

interface DropRow {
  id: string
  name: string
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  launchDate: string
  productCount: number
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  totalMargin: number
  stockSoldPct: number
}

interface ProductRow {
  productId: string
  productName: string
  dropId: string
  dropName: string
  dropStatus: string
  unitsSold: number
  revenue: number
  totalCosts: number
  profit: number
  margin: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n)
}

function pct(n: number) { return `${n.toFixed(1)}%` }

function MarginBadge({ margin }: { margin: number }) {
  const color =
    margin >= 30 ? "text-[#00903c] bg-[#e6faf0]"
    : margin >= 10 ? "text-amber-700 bg-amber-50"
    : "text-red-600 bg-red-50"
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {pct(margin)}
    </span>
  )
}

function MarginBar({ margin }: { margin: number }) {
  const color = margin >= 30 ? "bg-[#00C46A]" : margin >= 10 ? "bg-amber-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-gray-100 rounded-full">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${Math.max(0, Math.min(Math.abs(margin), 100))}%` }}
        />
      </div>
      <MarginBadge margin={margin} />
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", ACTIVE: "Activo", CLOSED: "Cerrado",
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfitabilityPage() {
  const [view, setView] = useState<"drops" | "products">("drops")
  const [drops, setDrops] = useState<DropRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/profitability?view=${view}`)
      .then((r) => r.json())
      .then((d) => {
        if (view === "drops") setDrops(d.drops || [])
        else setProducts(d.products || [])
      })
      .finally(() => setLoading(false))
  }, [view])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rentabilidad</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ranking de drops y productos por margen</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {(["drops", "products"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "drops" ? "Por Drop" : "Por Producto"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : view === "drops" ? (
        <DropsTable drops={drops} />
      ) : (
        <ProductsTable products={products} />
      )}
    </div>
  )
}

function DropsTable({ drops }: { drops: DropRow[] }) {
  if (drops.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-400">No hay drops con datos de rentabilidad aún</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["#", "Drop", "Estado", "Lanzamiento", "Productos", "Ingresos", "Gastos", "Margen ($)", "Margen (%)"].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drops.map((drop, i) => (
              <tr key={drop.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/drops/${drop.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00903c] transition-colors">
                    {drop.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">{STATUS_LABEL[drop.status] || drop.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(drop.launchDate).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{drop.productCount}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{fmt(drop.totalRevenue)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{fmt(drop.totalCosts)}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  <span className={drop.totalProfit >= 0 ? "text-[#00903c]" : "text-red-500"}>
                    {fmt(drop.totalProfit)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <MarginBar margin={drop.totalMargin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductsTable({ products }: { products: ProductRow[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-400">No hay productos con datos de rentabilidad aún</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["#", "Producto", "Drop", "Unidades", "Ingresos", "Costos", "Margen ($)", "Margen (%)"].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p.productId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.productName}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/drops/${p.dropId}`} className="text-sm text-gray-500 hover:text-[#00903c] transition-colors">
                    {p.dropName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{p.unitsSold}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{fmt(p.revenue)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{fmt(p.totalCosts)}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  <span className={p.profit >= 0 ? "text-[#00903c]" : "text-red-500"}>
                    {fmt(p.profit)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <MarginBar margin={p.margin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
