import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getWorkspaceStats } from "@/lib/tinybird"
import { getDateRange, formatNumber, formatCurrency } from "@/lib/utils"
import { MetricCard } from "./metric-card"
import Link from "next/link"
import { shortUrlLabel } from "@/lib/links"
import { StatusDot, type DotStatus } from "@/components/ui"

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

const STATUS_DOT: Record<string, DotStatus> = {
  ACTIVE: "active",
  PAUSED: "pending",
  CLOSED: "inactive",
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
    <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-10 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">{workspace.name}</h1>
          <p className="text-[13px] text-ink-tertiary mt-0.5">Últimos 30 días</p>
        </div>
        {connected ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink bg-surface shadow-pill px-3.5 py-1.5 rounded-pill">
            <span className="kool-dot" style={{ width: 6, height: 6 }} />
            <span className="hidden sm:inline">Tiendanube</span>
            <span className="sm:hidden">Conectada</span>
          </span>
        ) : (
          <Link
            href="/dashboard/settings?tab=integrations"
            className="flex items-center gap-1.5 text-[12px] font-medium text-pink-text bg-pink-fill px-3.5 py-1.5 rounded-pill hover:bg-pink-fill-hover transition-colors duration-fast pressable"
          >
            <span className="hidden sm:inline">Conectar Tiendanube</span>
            <span className="sm:hidden">Conectar</span>
          </Link>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 lg:mb-8">
        <MetricCard
          label="Clicks"
          value={formatNumber(stats.clicks)}
          sub={`${formatNumber(stats.unique_clicks)} únicos`}
          featured
          live={stats.clicks > 0}
          data={generateSparkline(stats.clicks)}
        />
        <MetricCard
          label="Leads"
          value={formatNumber(leadsCount)}
          sub="aplicaciones recibidas"
          data={generateSparkline(leadsCount)}
        />
        <MetricCard
          label="Comisiones"
          value={formatCurrency(totalCommissions)}
          sub="acumuladas"
          data={generateSparkline(totalCommissions)}
        />
      </div>

      {/* Recent campaigns */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-ink">Campañas recientes</span>
          <Link
            href="/dashboard/campaigns"
            className="text-[12px] font-medium text-pink-text bg-pink-fill px-3 py-1 rounded-pill hover:bg-pink-fill-hover transition-colors duration-fast"
          >
            Ver todas
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="bg-surface rounded-card px-5 py-12 text-center">
            <span
              className="kool-dot mx-auto mb-4 block opacity-60"
              style={{ width: 8, height: 8 }}
            />
            <p className="text-[13px] text-ink-secondary mb-4">
              Todavía no creaste ninguna campaña.
            </p>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-block text-[13px] font-medium text-white bg-pink px-4 py-2 rounded-pill hover:bg-pink-strong transition-colors duration-fast pressable"
            >
              Crear primera campaña
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
                className="bg-white shadow-card rounded-card p-5 transition-[box-shadow,transform] duration-base ease-out-strong hover:shadow-card-hover hover:-translate-y-px"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <p className="text-[13px] font-medium text-ink leading-snug line-clamp-2 flex-1">
                    {campaign.name}
                  </p>
                  <StatusDot
                    status={STATUS_DOT[campaign.formStatus] ?? "inactive"}
                    label={STATUS_LABEL[campaign.formStatus] ?? campaign.formStatus}
                    className="shrink-0 text-[11px]"
                  />
                </div>
                <div className="flex items-center gap-2 mt-auto text-[11px] text-ink-tertiary">
                  <span className="font-mono tnum">{campaign._count.creators}</span>
                  <span>creator{campaign._count.creators !== 1 ? "s" : ""}</span>
                  <span className="opacity-50">·</span>
                  <span className="font-mono tnum">{campaign._count.applications}</span>
                  <span>aplicacion{campaign._count.applications !== 1 ? "es" : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-ink">Eventos recientes</span>
        </div>

        <div className="bg-white shadow-card rounded-card overflow-hidden">
          {recentEvents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[13px] text-ink-secondary">
                Todavía no hay comisiones registradas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left text-[11px] font-medium text-ink-tertiary px-4 py-3">
                      Creator
                    </th>
                    <th className="text-left text-[11px] font-medium text-ink-tertiary px-4 py-3">
                      Link
                    </th>
                    <th className="text-left text-[11px] font-medium text-ink-tertiary px-4 py-3 hidden sm:table-cell">
                      Campaña
                    </th>
                    <th className="text-right text-[11px] font-medium text-ink-tertiary px-4 py-3">
                      Orden
                    </th>
                    <th className="text-right text-[11px] font-medium text-ink-tertiary px-4 py-3">
                      Comisión
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((commission, i) => (
                    <tr
                      key={commission.id}
                      className={i < recentEvents.length - 1 ? "border-b border-hairline" : ""}
                    >
                      <td className="px-4 py-3 text-[13px] text-ink">{commission.creator.name}</td>
                      <td className="px-4 py-3 text-[11.5px] font-mono text-ink-secondary">
                        {commission.conversion.link
                          ? shortUrlLabel(commission.conversion.link.slug)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-secondary hidden sm:table-cell">
                        {commission.conversion.link?.campaign?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono tnum text-ink-secondary text-right">
                        {formatCurrency(commission.orderAmount)}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono tnum font-medium text-pink-text text-right">
                        {formatCurrency(commission.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OnboardingPrompt() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-xs animate-fade-up">
        <div className="w-10 h-10 bg-pink-fill rounded-card flex items-center justify-center mx-auto mb-4">
          <span className="kool-dot" style={{ width: 7, height: 7 }} />
        </div>
        <h2 className="text-base font-medium tracking-[-0.01em] text-ink mb-2">
          Configurá tu workspace
        </h2>
        <p className="text-[13px] text-ink-secondary mb-6">
          Necesitás crear un workspace para empezar a usar Kool.
        </p>
        <Link
          href="/onboarding"
          className="inline-block bg-pink text-white text-[13px] font-medium px-5 py-2.5 rounded-pill hover:bg-pink-strong transition-colors duration-fast pressable"
        >
          Crear workspace
        </Link>
      </div>
    </div>
  )
}
