"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Rocket, TrendingUp, Package } from "lucide-react"

interface DropCard {
  id: string
  name: string
  slug: string
  description: string | null
  coverImage: string | null
  launchDate: string
  closeDate: string | null
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  productCount: number
  totalRevenue: number
  totalExpenses: number
  profit: number
  margin: number
  stockSoldPct: number
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  CLOSED: "Cerrado",
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  ACTIVE: "bg-[#e6faf0] text-[#00903c]",
  CLOSED: "bg-gray-100 text-gray-400",
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n)
}

export default function DropsPage() {
  const [drops, setDrops] = useState<DropCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/drops")
      .then((r) => r.json())
      .then((d) => setDrops(d.drops || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Drops</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestioná tus lanzamientos y calculá rentabilidad</p>
        </div>
        <Link
          href="/dashboard/drops/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus size={15} />
          Crear Drop
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : drops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <Rocket size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Todavía no hay drops</p>
          <p className="text-sm text-gray-400 mb-6">Creá tu primer lanzamiento para trackear ventas y rentabilidad</p>
          <Link
            href="/dashboard/drops/new"
            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} />
            Crear Drop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drops.map((drop) => (
            <Link
              key={drop.id}
              href={`/dashboard/drops/${drop.id}`}
              className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3 mb-4">
                {drop.coverImage ? (
                  <img
                    src={drop.coverImage}
                    alt={drop.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-500">
                      {drop.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{drop.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLE[drop.status]}`}>
                      {STATUS_LABEL[drop.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(drop.launchDate).toLocaleDateString("es-AR", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Avance stock</p>
                  <p className="text-sm font-semibold text-gray-900">{drop.stockSoldPct.toFixed(0)}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Ingresos</p>
                  <p className="text-sm font-semibold text-gray-900">{fmt(drop.totalRevenue)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Rentabilidad</p>
                  <p className={`text-sm font-semibold ${drop.profit >= 0 ? "text-[#00903c]" : "text-red-500"}`}>
                    {fmt(drop.profit)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Productos</p>
                  <p className="text-sm font-semibold text-gray-900">{drop.productCount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
