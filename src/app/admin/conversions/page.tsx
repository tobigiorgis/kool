import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  PAID: "bg-blue-50 text-blue-700",
  REJECTED: "bg-red-50 text-red-700",
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  PAID: "Pagada",
  REJECTED: "Rechazada",
}

export default async function AdminConversionsPage() {
  const user = await currentUser()
  if (user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) redirect("/dashboard")

  const conversions = await prisma.conversion.findMany({
    include: {
      creator: { select: { name: true, email: true } },
      campaign: { select: { name: true } },
      link: { select: { slug: true } },
      commission: { select: { amount: true, percentage: true, status: true, currency: true } },
    },
    orderBy: { convertedAt: "desc" },
    take: 500,
  })

  const totalRevenue = conversions.reduce((sum, c) => sum + c.orderAmount, 0)
  const totalCommissions = conversions.reduce((sum, c) => sum + (c.commission?.amount ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#F9F9FB] px-4 py-8 lg:px-10 lg:py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
            ← Admin
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Conversiones</h1>
          <span className="ml-auto text-[12px] font-mono text-gray-400">{conversions.length} mostradas</span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total conversiones</p>
            <p className="font-mono text-2xl font-semibold text-gray-900 mt-1">{conversions.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Revenue total</p>
            <p className="font-mono text-2xl font-semibold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Comisiones totales</p>
            <p className="font-mono text-2xl font-semibold text-green-700 mt-1">{formatCurrency(totalCommissions)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Ticket promedio</p>
            <p className="font-mono text-2xl font-semibold text-gray-900 mt-1">
              {conversions.length > 0 ? formatCurrency(totalRevenue / conversions.length) : "—"}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Fecha</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Orden</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Creator</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Campaña</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Link</th>
                  <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Orden</th>
                  <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Comisión</th>
                  <th className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((cv, i) => (
                  <tr key={cv.id} className={i < conversions.length - 1 ? "border-b border-gray-50" : ""}>
                    <td className="px-5 py-3 text-[11px] text-gray-400 font-mono whitespace-nowrap">
                      {fmtDate(cv.convertedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                        #{cv.orderId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {cv.creator ? (
                        <div>
                          <p className="text-[12px] font-medium text-gray-800">{cv.creator.name}</p>
                          <p className="text-[11px] text-gray-400">{cv.creator.email}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-600">{cv.campaign?.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {cv.link ? (
                        <span className="font-mono text-[11px] text-gray-500">{cv.link.slug}</span>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[13px] font-medium text-gray-900">
                        {formatCurrency(cv.orderAmount)}
                      </span>
                      <p className="text-[10px] text-gray-400 font-mono">{cv.currency}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {cv.commission ? (
                        <div>
                          <span className="font-mono text-[13px] font-medium text-green-700">
                            {formatCurrency(cv.commission.amount)}
                          </span>
                          <p className="text-[10px] text-gray-400 font-mono">{cv.commission.percentage}%</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {cv.commission ? (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[cv.commission.status] ?? "bg-gray-50 text-gray-500"}`}>
                          {STATUS_LABEL[cv.commission.status] ?? cv.commission.status}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">Sin comisión</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
