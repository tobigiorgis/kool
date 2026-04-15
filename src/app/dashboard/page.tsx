import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getWorkspaceStats } from "@/lib/tinybird"
import { getDateRange, formatNumber, formatCurrency } from "@/lib/utils"
import { Link2, Users, MousePointerClick, TrendingUp, ArrowUpRight, Zap } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const { userId } = await auth()

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: userId! },
    include: { workspace: { include: { tiendanubeConnection: true } } },
  })

  if (!member) return <OnboardingPrompt />

  const workspace = member.workspace
  const { from, to } = getDateRange("30d")

  const [stats, linksCount, creatorsCount, pendingCommissions, recentLinks] = await Promise.all([
    getWorkspaceStats(workspace.id, from, to).catch(() => ({ clicks: 0, unique_clicks: 0 })),
    prisma.link.count({ where: { workspaceId: workspace.id, archived: false } }),
    prisma.creator.count({ where: { workspaceId: workspace.id, status: "ACTIVE" } }),
    prisma.commission.aggregate({
      where: { creator: { workspaceId: workspace.id }, status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.link.findMany({
      where: { workspaceId: workspace.id, archived: false },
      include: { creator: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  const pendingAmount = pendingCommissions._sum.amount ?? 0

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">Últimos 30 días</p>
      </div>

      {/* Banner Tiendanube */}
      {!workspace.tiendanubeConnection && (
        <div className="mb-8 flex items-center justify-between px-4 py-3 border border-[#f0f0f0] rounded-lg bg-[#fafafa]">
          <p className="text-[13px] text-gray-500">
            Conectá tu tienda Tiendanube para trackear conversiones automáticamente.
          </p>
          <Link
            href="/dashboard/settings?tab=integrations"
            className="flex items-center gap-1 text-[12px] font-medium text-gray-700 hover:text-gray-900 transition-colors ml-4 flex-shrink-0"
          >
            Conectar <ArrowUpRight size={11} />
          </Link>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <MetricCard label="Clics" value={formatNumber(stats.clicks)} sub="totales" />
        <MetricCard
          label="Únicos"
          value={formatNumber(stats.unique_clicks)}
          sub={stats.clicks > 0 ? `${Math.round((stats.unique_clicks / stats.clicks) * 100)}% del total` : "—"}
        />
        <MetricCard label="Links" value={linksCount.toString()} sub={`${creatorsCount} creators activos`} />
        <MetricCard label="Comisiones" value={formatCurrency(pendingAmount)} sub="pendientes" accent />
      </div>

      {/* Links recientes */}
      <div className="border border-[#f0f0f0] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0f0f0]">
          <span className="text-[13px] font-medium text-gray-900">Links recientes</span>
          <Link href="/dashboard/links" className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">
            Ver todos →
          </Link>
        </div>

        {recentLinks.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] text-gray-400">Todavía no creaste ningún link.</p>
            <Link href="/dashboard/links" className="inline-block mt-3 text-[13px] font-medium text-brand-400 hover:text-brand-500">
              Crear primer link →
            </Link>
          </div>
        ) : (
          <div>
            {recentLinks.map((link, i) => (
              <div
                key={link.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${i < recentLinks.length - 1 ? "border-b border-[#f0f0f0]" : ""}`}
              >
                <div className="w-7 h-7 rounded-md bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
                  <Link2 size={12} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">
                    kool.link/{link.slug}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{link.destination}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {link.creator && (
                    <span className="text-[11px] text-gray-500 bg-[#f5f5f5] px-2 py-0.5 rounded-md">
                      {link.creator.name}
                    </span>
                  )}
                  {link.discountCode && (
                    <span className="text-[11px] font-mono text-gray-500 bg-[#f5f5f5] px-2 py-0.5 rounded-md">
                      {link.discountCode}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label, value, sub, accent = false,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className="border border-[#f0f0f0] rounded-xl p-5">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-3">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${accent ? "text-brand-400" : "text-gray-900"}`}>
        {value}
      </p>
      <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
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
