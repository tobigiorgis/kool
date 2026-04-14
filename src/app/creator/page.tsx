import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCreatorStats } from "@/lib/tinybird"
import { getDateRange, formatCurrency, formatNumber } from "@/lib/utils"
import { Link2, Gift, DollarSign, MousePointerClick, Instagram, Copy } from "lucide-react"
import Link from "next/link"

export default async function CreatorDashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({
    where: { user: { id: userId } },
    include: {
      links: { where: { archived: false } },
      giftingOrders: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      commissions: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  })

  if (!creator) redirect("/onboarding/creator")

  const { from, to } = getDateRange("30d")
  const stats = await getCreatorStats(creator.id, from, to).catch(() => ({
    clicks: 0,
    unique_clicks: 0,
  }))

  const pendingAmount = creator.commissions
    .filter((c) => c.status === "PENDING")
    .reduce((s, c) => s + c.amount, 0)

  const approvedAmount = creator.commissions
    .filter((c) => c.status === "APPROVED")
    .reduce((s, c) => s + c.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-gray-900">kool</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold">
              {creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 leading-none">{creator.name}</p>
              <span className="text-xs text-gray-400 capitalize">{creator.tier.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Tu código */}
        {creator.discountCode && (
          <div className="bg-gradient-to-r from-brand-400 to-brand-500 rounded-2xl p-6 text-white">
            <p className="text-sm font-medium opacity-80 mb-1">Tu código de descuento</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-wider">{creator.discountCode}</span>
              <button
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy size={14} />
                Copiar
              </button>
            </div>
            <p className="text-xs opacity-70 mt-2">
              Compartilo con tu comunidad — ellos obtienen un descuento y vos ganás {creator.commissionPct}% de comisión por cada venta.
            </p>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Clics (30d)</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.clicks)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-amber-500" />
              <span className="text-xs text-gray-500">Pendiente de pago</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(pendingAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-brand-500" />
              <span className="text-xs text-gray-500">Listo para cobrar</span>
            </div>
            <p className="text-2xl font-semibold text-brand-600">{formatCurrency(approvedAmount)}</p>
          </div>
        </div>

        {/* Mis links */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Link2 size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Mis links</h2>
          </div>
          {creator.links.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Todavía no tenés links asignados.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {creator.links.map((link) => (
                <div key={link.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-600">kool.link/{link.slug}</p>
                    <p className="text-xs text-gray-400 truncate">{link.destination}</p>
                  </div>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0">
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gifting reciente */}
        {creator.giftingOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Gift size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Gifting recibido</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {creator.giftingOrders.map((order) => (
                <div key={order.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900">
                      {(order.products as any[]).map((p: any) => p.name).join(", ")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{order.status}</p>
                  </div>
                  {order.status === "DELIVERED" && (
                    <button className="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100">
                      Confirmar recepción
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
