import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils/index"
import { Copy, Link2, Tag, TrendingUp, ShoppingCart, DollarSign } from "lucide-react"
import ProgramOverviewClient from "./ProgramOverviewClient"

async function getCreatorAndData(userId: string, workspaceId: string) {
  const creator = await prisma.creator.findFirst({
    where: { workspaceId, userId },
    include: {
      workspace: true,
      links: { where: { archived: false } },
    },
  })
  if (!creator) return null

  const commissions = await prisma.commission.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      conversion: { include: { link: { select: { slug: true } } } },
    },
  })

  const totalEarnings = await prisma.commission.aggregate({
    where: { creatorId: creator.id },
    _sum: { amount: true },
  })

  const salesCount = await prisma.commission.count({
    where: { creatorId: creator.id },
  })

  const revenueSum = await prisma.commission.aggregate({
    where: { creatorId: creator.id },
    _sum: { orderAmount: true },
  })

  // Clicks: count Click records for creator's links
  const linkIds = creator.links.map((l) => l.id)
  const clickCount = linkIds.length
    ? await prisma.click.count({ where: { linkId: { in: linkIds } } })
    : 0

  // Monthly earnings for chart (last 6 months)
  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const earningsForChart = await prisma.commission.findMany({
    where: { creatorId: creator.id, createdAt: { gte: sixMonthsAgo } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  return {
    creator,
    commissions,
    totalEarnings: totalEarnings._sum.amount ?? 0,
    salesCount,
    revenue: revenueSum._sum.orderAmount ?? 0,
    clickCount,
    earningsForChart: earningsForChart.map((e) => ({
      amount: e.amount,
      date: e.createdAt.toISOString(),
    })),
  }
}

export default async function ProgramOverviewPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const data = await getCreatorAndData(userId, workspaceId)
  if (!data) notFound()

  const { creator, commissions, totalEarnings, salesCount, revenue, clickCount, earningsForChart } =
    data

  const firstLink = creator.links[0]

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      PENDING: { label: "Pendiente", cls: "bg-yellow-50 text-yellow-700" },
      APPROVED: { label: "Aprobada", cls: "bg-green-50 text-green-700" },
      PAID: { label: "Pagada", cls: "bg-blue-50 text-blue-700" },
      REJECTED: { label: "Rechazada", cls: "bg-red-50 text-red-700" },
    }
    const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" }
    return (
      <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
        {s.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Program summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "#F8BBD0" }}
              >
                {creator.workspace.brandLogo ?? creator.workspace.logo ? (
                  <img
                    src={(creator.workspace.brandLogo ?? creator.workspace.logo)!}
                    alt=""
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-gray-700">
                    {creator.workspace.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{creator.workspace.name}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {creator.commissionPct}% comisión por venta
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {firstLink && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Link2 size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Tu link</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-gray-800 truncate">
                    kool.link/{firstLink.slug}
                  </span>
                  <ProgramOverviewClient
                    copyValue={`https://kool.link/${firstLink.slug}`}
                    type="link"
                  />
                </div>
              </div>
            )}

            {creator.discountCode && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Código de descuento</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono font-semibold text-gray-800">
                    {creator.discountCode}
                  </span>
                  <ProgramOverviewClient copyValue={creator.discountCode} type="code" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                <TrendingUp size={14} className="text-gray-500" />
              </div>
              <span className="text-xs text-gray-500">Clics totales</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{clickCount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                <ShoppingCart size={14} className="text-gray-500" />
              </div>
              <span className="text-xs text-gray-500">Ventas</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{salesCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                <DollarSign size={14} className="text-gray-500" />
              </div>
              <span className="text-xs text-gray-500">Revenue generado</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(revenue)}</p>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Ganancias</h2>
              <p className="text-3xl font-semibold text-gray-900 mt-1">
                {formatCurrency(totalEarnings)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">acumulado total</p>
            </div>
          </div>

          {/* Simple chart using earningsForChart */}
          {earningsForChart.length > 0 && (
            <ProgramOverviewClient chartData={earningsForChart} type="chart" />
          )}
        </div>

        {/* Recent earnings table */}
        {commissions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Comisiones recientes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Fecha</th>
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Link</th>
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Estado</th>
                    <th className="text-right text-xs text-gray-400 font-medium px-6 py-3">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 font-mono text-xs">
                        {c.conversion.link?.slug
                          ? `kool.link/${c.conversion.link.slug}`
                          : "—"}
                      </td>
                      <td className="px-6 py-3">{statusBadge(c.status)}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
