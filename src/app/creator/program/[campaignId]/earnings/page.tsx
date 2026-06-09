import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function EarningsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({ where: { userId } })
  if (!creator) redirect("/onboarding/creator")

  const cc = await prisma.campaignCreator.findFirst({
    where: { campaignId, creatorId: creator.id },
  })
  if (!cc) notFound()

  const commissions = await prisma.commission.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    include: {
      conversion: { include: { link: { select: { slug: true } } } },
    },
  })

  const totalEarnings = commissions.reduce((s, c) => s + c.amount, 0)
  const pendingEarnings = commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0)
  const paidEarnings = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Earnings</h1>
        <p className="text-sm text-gray-400 mt-0.5">{commissions.length} comisione{commissions.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="border-t border-gray-200" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">{formatCurrency(totalEarnings)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-400 mb-1">Pendiente</p>
          <p className="text-2xl font-semibold text-amber-600 tracking-tight">{formatCurrency(pendingEarnings)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-400 mb-1">Pagado</p>
          <p className="text-2xl font-semibold text-green-600 tracking-tight">{formatCurrency(paidEarnings)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {commissions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">Sin ganancias todavía.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Fecha", "Link", "Venta", "Comisión", "Estado"].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${
                      h === "Venta" || h === "Comisión" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {commissions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] text-gray-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 font-mono">
                    {c.conversion?.link?.slug ? `kool.link/${c.conversion.link.slug}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-gray-900 text-right">{formatCurrency(c.orderAmount)}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-900 text-right">{formatCurrency(c.amount)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Pendiente", cls: "bg-amber-50 text-amber-600" },
    APPROVED: { label: "Procesando", cls: "bg-blue-50 text-blue-600" },
    PAID: { label: "Pagado", cls: "bg-green-50 text-green-600" },
    REJECTED: { label: "Rechazado", cls: "bg-red-50 text-red-600" },
  }
  const c = cfg[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" }
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  )
}
