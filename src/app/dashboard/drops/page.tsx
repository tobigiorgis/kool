"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Rocket } from "lucide-react"
import { DROP_STATUS_LABELS, DROP_STATUS_COLORS, stageProgressColor } from "@/lib/drops/stages"

interface DropCard {
  id: string
  name: string
  slug: string
  coverImage: string | null
  launchDate: string
  status: "PRE_LAUNCH" | "ACTIVE" | "CLOSED"
  productCount: number
  totalRevenue: number
  profit: number
  stockSoldPct: number
  productionProgress: number
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
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
          <p className="text-sm text-gray-400 mb-6">Creá tu primer lanzamiento para trackear producción y rentabilidad</p>
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
            <DropCard key={drop.id} drop={drop} />
          ))}
        </div>
      )}
    </div>
  )
}

function DropCard({ drop }: { drop: DropCard }) {
  const showFinancials = drop.status === "ACTIVE" || drop.status === "CLOSED"
  const barColor = stageProgressColor(drop.productionProgress)

  return (
    <Link
      href={`/dashboard/drops/${drop.id}`}
      className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-sm transition-all group flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {drop.coverImage ? (
          <img src={drop.coverImage} alt={drop.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-gray-500">{drop.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{drop.name}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${DROP_STATUS_COLORS[drop.status]}`}>
              {DROP_STATUS_LABELS[drop.status]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(drop.launchDate).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Avance de producción */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Producción</span>
          <span className="text-xs font-medium text-gray-700">{drop.productionProgress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full">
          <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${drop.productionProgress}%` }} />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-400 mb-0.5">Productos</p>
          <p className="text-sm font-semibold text-gray-900">{drop.productCount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-400 mb-0.5">Ingresos</p>
          <p className="text-sm font-semibold text-gray-900">{showFinancials ? fmt(drop.totalRevenue) : "—"}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-400 mb-0.5">Resultado</p>
          <p className={`text-sm font-semibold ${showFinancials ? (drop.profit >= 0 ? "text-[#00903c]" : "text-red-500") : "text-gray-400"}`}>
            {showFinancials ? fmt(drop.profit) : "—"}
          </p>
        </div>
      </div>
    </Link>
  )
}
