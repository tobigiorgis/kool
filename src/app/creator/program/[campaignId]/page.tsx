import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { CopyLinkButton } from "./copy-link-button"
import { Tag, DollarSign } from "lucide-react"

export default async function ProgramOverviewPage({
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
    include: {
      campaign: {
        include: { workspace: true },
      },
    },
  })
  if (!cc) notFound()

  const { campaign } = cc
  const brandName = campaign.workspace.name
  const brandLogo = campaign.workspace.brandLogo
  const brandColor = campaign.workspace.brandColor ?? "#111827"
  const commissionPct = cc.commissionPct ?? creator.commissionPct
  const discountCode = cc.discountCode ?? creator.discountCode

  // Creator's links for this campaign
  const links = await prisma.link.findMany({
    where: { creatorId: creator.id, campaignId, archived: false },
    select: { id: true, slug: true, destination: true },
  })
  const linkIds = links.map((l) => l.id)
  const firstLink = links[0]

  // Aggregate metrics
  const [totalClickCount, commissions] = await Promise.all([
    linkIds.length
      ? prisma.click.count({ where: { linkId: { in: linkIds } } })
      : 0,
    prisma.commission.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        conversion: { include: { link: { select: { slug: true } } } },
      },
    }),
  ])

  const totalEarnings = commissions.reduce((s, c) => s + c.amount, 0)
  const salesCount = commissions.length
  const pendingEarnings = commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amount, 0)
  const paidEarnings = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0)

  // Monthly earnings for chart (last 6 months)
  const now = new Date()
  const months: { label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = d.toLocaleDateString("es-AR", { month: "short" })
    const amount = commissions
      .filter((c) => new Date(c.createdAt) >= d && new Date(c.createdAt) < end)
      .reduce((s, c) => s + c.amount, 0)
    months.push({ label, amount })
  }

  const recentEarnings = commissions.slice(0, 8)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-5">
      {/* Header card */}
      <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div
          className="absolute top-0 right-0 w-1/3 h-full opacity-50"
          style={{
            background: `linear-gradient(to left, ${brandColor}22, transparent)`,
          }}
        />
        <div className="relative p-6">
          <div className="absolute top-5 right-5">
            <BrandLogo name={brandName} logo={brandLogo} color={brandColor} size={56} />
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Overview</p>
          <h1 className="text-lg font-semibold text-gray-900 mb-4">{brandName}</h1>

          {/* Referral link */}
          {firstLink && (
            <div className="mb-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Referral link</p>
              <div className="flex items-center gap-2 max-w-md">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-[13px] text-gray-700 font-mono">kool.link/{firstLink.slug}</span>
                </div>
                <CopyLinkButton value={`https://kool.link/${firstLink.slug}`} />
              </div>
            </div>
          )}

          {/* Rewards */}
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Rewards</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[13px] text-gray-700">
                <DollarSign size={13} className="text-gray-400" />
                {commissionPct}% por venta
              </div>
              {discountCode && (
                <div className="flex items-center gap-2 text-[13px] text-gray-700">
                  <Tag size={13} className="text-gray-400" />
                  Tus seguidores obtienen descuento con código{" "}
                  <span className="font-mono font-semibold">{discountCode}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Earnings chart + Payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Earnings chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] text-gray-500">Earnings</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight mb-5">
            {formatCurrency(totalEarnings)}
          </p>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-28">
            {months.map((m) => {
              const max = Math.max(...months.map((x) => x.amount), 1)
              const pct = (m.amount / max) * 100
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-violet-100 relative" style={{ height: "88px" }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-md bg-violet-400"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payouts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-gray-900">Payouts</p>
            <Link href="/creator/payouts" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Ver todos →
            </Link>
          </div>

          <div className="space-y-0.5 mb-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-[12px] text-gray-500">Pendiente</span>
              <span className="text-[13px] font-semibold text-amber-600">{formatCurrency(pendingEarnings)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[12px] text-gray-500">Pagado</span>
              <span className="text-[13px] font-semibold text-green-600">{formatCurrency(paidEarnings)}</span>
            </div>
          </div>

          {commissions.slice(0, 4).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-t border-gray-50">
              <div>
                <p className="text-[13px] font-medium text-gray-900">{formatCurrency(c.amount)}</p>
                <p className="text-[11px] text-gray-400">{formatDate(c.createdAt)}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Clicks" value={totalClickCount.toLocaleString()} color="indigo" />
        <MetricCard label="Sales" value={salesCount.toLocaleString()} color="purple" />
        <MetricCard label="Revenue" value={formatCurrency(totalEarnings)} color="green" />
      </div>

      {/* Recent earnings table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-gray-900">Recent earnings</p>
          <Link
            href={`/creator/program/${campaignId}/earnings`}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {recentEarnings.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px] text-gray-400">Sin ganancias todavía.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Date", "Link", "Sale Amount", "Earnings", "Status"].map((h) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${h === "Sale Amount" || h === "Earnings" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentEarnings.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] text-gray-500">{formatDate(e.createdAt)}</td>
                    <td className="px-5 py-3 text-[13px] text-gray-700 font-mono">
                      {e.conversion?.link?.slug ? `kool.link/${e.conversion.link.slug}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-gray-900 text-right">
                      {formatCurrency(e.orderAmount)}
                    </td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-gray-900 text-right">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function BrandLogo({ name, logo, color, size }: { name: string; logo: string | null; color: string; size: number }) {
  if (logo) {
    return <img src={logo} className="rounded-2xl object-cover opacity-90" style={{ width: size, height: size }} alt={name} />
  }
  return (
    <div className="rounded-2xl flex items-center justify-center opacity-90" style={{ width: size, height: size, backgroundColor: color }}>
      <span className="text-white font-bold" style={{ fontSize: Math.round(size * 0.44) }}>
        {name[0]?.toUpperCase()}
      </span>
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-500",
    purple: "bg-purple-50 text-purple-500",
    green: "bg-brand-50 text-brand-600",
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-[12px] text-gray-400 mb-2">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "Pending", cls: "bg-amber-50 text-amber-600" },
    APPROVED: { label: "Processing", cls: "bg-blue-50 text-blue-600" },
    PAID: { label: "Completed", cls: "bg-green-50 text-green-600" },
    REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-600" },
  }
  const c = cfg[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" }
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  )
}
