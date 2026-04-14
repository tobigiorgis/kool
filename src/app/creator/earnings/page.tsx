import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import { DollarSign, Clock, CheckCircle, XCircle } from "lucide-react"

const STATUS_CONFIG = {
  PENDING:  { label: "Pendiente",  style: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { label: "Aprobada",   style: "bg-green-100 text-green-700",   icon: CheckCircle },
  PAID:     { label: "Pagada",     style: "bg-blue-100 text-blue-700",     icon: DollarSign },
  REJECTED: { label: "Rechazada",  style: "bg-red-100 text-red-700",       icon: XCircle },
} as const

export default async function CreatorEarningsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({
    where: { user: { id: userId } },
    include: {
      commissions: {
        include: { conversion: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!creator) redirect("/creator")

  const totalEarned = creator.commissions
    .filter((c) => c.status === "PAID")
    .reduce((s, c) => s + c.amount, 0)

  const totalApproved = creator.commissions
    .filter((c) => c.status === "APPROVED")
    .reduce((s, c) => s + c.amount, 0)

  const totalPending = creator.commissions
    .filter((c) => c.status === "PENDING")
    .reduce((s, c) => s + c.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/creator" className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-gray-900">kool</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold">
              {creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <span className="text-sm font-medium text-gray-900">{creator.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mis ganancias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial completo de comisiones</p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-1">Total cobrado</p>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalEarned)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-1">Listo para cobrar</p>
            <p className="text-xl font-semibold text-brand-600">{formatCurrency(totalApproved)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-500 mb-1">En revisión</p>
            <p className="text-xl font-semibold text-amber-600">{formatCurrency(totalPending)}</p>
          </div>
        </div>

        {/* Tabla de comisiones */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Historial de comisiones</h2>
          </div>

          {creator.commissions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <DollarSign size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Todavía no tenés comisiones registradas.</p>
              <p className="text-xs text-gray-400 mt-1">
                Compartí tu código de descuento para empezar a generar ventas.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Orden</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Venta</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Comisión</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {creator.commissions.map((commission) => {
                  const config = STATUS_CONFIG[commission.status as keyof typeof STATUS_CONFIG]
                  const Icon = config?.icon ?? Clock
                  return (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(commission.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500 text-xs">
                        #{commission.conversion.orderId.slice(-8)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(commission.orderAmount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-brand-600">
                          {formatCurrency(commission.amount)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">({commission.percentage}%)</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${config?.style}`}>
                          <Icon size={10} />
                          {config?.label ?? commission.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalApproved > 0 && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-800">
                Tenés {formatCurrency(totalApproved)} listos para cobrar
              </p>
              <p className="text-xs text-brand-600 mt-0.5">
                Contactá a la marca para coordinar el pago.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
