import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getWorkspaceStats } from "@/lib/tinybird"
import { getDateRange, formatNumber, formatCurrency } from "@/lib/utils"
import { MetricCard } from "./metric-card"
import { Zap, ArrowUpRight, CheckCircle2, XCircle, Megaphone } from "lucide-react"
import Link from "next/link"
import { shortUrlLabel } from "@/lib/links"

/** Deterministic sparkline from a seed value */
function generateSparkline(seed: number, points = 14): number[] {
  if (seed === 0) return Array(points).fill(0)
  let s = Math.round(seed * 100) + 1
  return Array.from({ length: points }, (_, i) => {
    s = (s * 9301 + 49297) % 233280
    const rand = s / 233280
    const trend = 0.4 + (i / points) * 0.6
    return Math.max(0, rand * trend * (seed / points) * 2.8)
  })
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  CLOSED: "Cerrada",
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-brand-100 text-brand-600",
  PAUSED: "bg-yellow-50 text-yellow-600",
  CLOSED: "bg-gray-100 text-gray-500",
}

export default async function DashboardPage() {
  const { userId } = await auth()

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: userId! },
    include: { workspace: { include: { tiendanubeConnection: true } } },
  })

  if (!member) return <OnboardingPrompt />

  const workspace = member.workspace
  const { from, to } = getDateRange("30d")

  const [stats, leadsCount, commissionsAgg, recentCampaigns, recentEvents] = await Promise.all([
    getWorkspaceStats(workspace.id, from, to).catch(() => ({ clicks: 0, unique_clicks: 0 })),
    prisma.application.count({ where: { campaign: { workspaceId: workspace.id } } }),
    prisma.commission.aggregate({
      where: { creator: { workspaceId: workspace.id } },
      _sum: { amount: true },
    }),
    prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      include: {
        _count: { select: { creators: true, applications: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.commission.findMany({
      where: { creator: { workspaceId: workspace.id } },
      include: {
        creator: { select: { name: true } },
        conversion: {
          include: {
            link: { select: { slug: true, campaign: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ])

  const totalCommissions = commissionsAgg._sum.amount ?? 0
  const connected = !!workspace.tiendanubeConnection

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Últimos 30 días</p>
        </div>
        {connected ? (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={12} />
            Tiendanube conectada
          </span>
        ) : (
          <Link
            href="/dashboard/settings?tab=integrations"
            className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 bg-[#fafafa] border border-[#f0f0f0] px-3 py-1.5 rounded-full hover:text-gray-800 transition-colors"
          >
            <XCircle size={12} className="text-gray-400" />
            Conectar Tiendanube
            <ArrowUpRight size={11} />
          </Link>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Clics"
          value={formatNumber(stats.clicks)}
          sub={`${formatNumber(stats.unique_clicks)} únicos`}
          color="rose"
          data={generateSparkline(stats.clicks)}
        />
        <MetricCard
          label="Leads"
          value={formatNumber(leadsCount)}
          sub="aplicaciones recibidas"
          color="violet"
          data={generateSparkline(leadsCount)}
        />
        <MetricCard
          label="Comisiones"
          value={formatCurrency(totalCommissions)}
          sub="acumuladas"
          color="green"
          data={generateSparkline(totalCommissions)}
        />
      </div>

      {/* Recent campaigns */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-gray-900">Campañas recientes</span>
          <Link
            href="/dashboard/campaigns"
            className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            Ver todas →
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="border border-[#f0f0f0] rounded-xl px-5 py-10 text-center">
            <Megaphone size={16} className="text-gray-300 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400 mb-3">Todavía no creaste ninguna campaña.</p>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-block text-[13px] font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              Crear primera campaña →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
                className="group border border-[#f0f0f0] rounded-xl p-5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[13px] font-medium text-gray-900 leading-snug line-clamp-2 flex-1 mr-2">
                    {campaign.name}
                  </p>
                  <span
                    className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      STATUS_STYLE[campaign.formStatus] ?? "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {STATUS_LABEL[campaign.formStatus] ?? campaign.formStatus}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-auto">
                  <span className="text-[11px] text-gray-400">
                    {campaign._count.creators} creator{campaign._count.creators !== 1 ? "s" : ""}
                  </span>
                  <span className="text-gray-200 text-[10px]">·</span>
                  <span className="text-[11px] text-gray-400">
                    {campaign._count.applications} aplicacion
                    {campaign._count.applications !== 1 ? "es" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-gray-900">Eventos recientes</span>
        </div>

        <div className="border border-[#f0f0f0] rounded-xl overflow-hidden">
          {recentEvents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-gray-400">Todavía no hay comisiones registradas.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0f0f0]">
                  <th className="text-left text-[11px] font-medium text-gray-400 px-5 py-3">
                    Creator
                  </th>
                  <th className="text-left text-[11px] font-medium text-gray-400 px-5 py-3">
                    Link
                  </th>
                  <th className="text-left text-[11px] font-medium text-gray-400 px-5 py-3">
                    Campaña
                  </th>
                  <th className="text-right text-[11px] font-medium text-gray-400 px-5 py-3">
                    Orden
                  </th>
                  <th className="text-right text-[11px] font-medium text-gray-400 px-5 py-3">
                    Comisión
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((commission, i) => (
                  <tr
                    key={commission.id}
                    className={i < recentEvents.length - 1 ? "border-b border-[#f0f0f0]" : ""}
                  >
                    <td className="px-5 py-3 text-[13px] text-gray-900">
                      {commission.creator.name}
                    </td>
                    <td className="px-5 py-3 text-[12px] font-mono text-gray-500">
                      {commission.conversion.link
                        ? shortUrlLabel(commission.conversion.link.slug)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-gray-500">
                      {commission.conversion.link?.campaign?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-gray-700 text-right">
                      {formatCurrency(commission.orderAmount)}
                    </td>
                    <td className="px-5 py-3 text-[12px] font-medium text-brand-500 text-right">
                      {formatCurrency(commission.amount)}
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

function OnboardingPrompt() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-xs">
        <div className="w-10 h-10 border border-[#f0f0f0] rounded-xl flex items-center justify-center mx-auto mb-4">
          <Zap size={16} className="text-brand-400" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Configurá tu workspace</h2>
        <p className="text-[13px] text-gray-400 mb-6">
          Necesitás crear un workspace para empezar a usar Kool.
        </p>
        <Link
          href="/onboarding"
          className="inline-block bg-gray-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Crear workspace
        </Link>
      </div>
    </div>
  )
}
