import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getWorkspaceStats, getWorkspaceClicksByDay } from "@/lib/tinybird"
import { getDateRange, formatNumber, formatCurrency } from "@/lib/utils"
import { Link2, Users, MousePointerClick, TrendingUp, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const { userId } = await auth()

  // Obtener workspace del usuario
  const member = await prisma.workspaceMember.findFirst({
    where: { user: { id: userId! } },
    include: { workspace: { include: { tiendanubeConnection: true } } },
  })

  if (!member) {
    return <OnboardingPrompt />
  }

  const workspace = member.workspace
  const { from, to } = getDateRange("30d")

  // Datos en paralelo
  const [stats, linksCount, creatorsCount, pendingCommissions, recentLinks] =
    await Promise.all([
      getWorkspaceStats(workspace.id, from, to).catch(() => ({ clicks: 0, unique_clicks: 0 })),
      prisma.link.count({ where: { workspaceId: workspace.id, archived: false } }),
      prisma.creator.count({ where: { workspaceId: workspace.id, status: "ACTIVE" } }),
      prisma.commission.aggregate({
        where: { creator: { workspaceId: workspace.id }, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.link.findMany({
        where: { workspaceId: workspace.id, archived: false },
        include: { creator: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ])

  const pendingAmount = pendingCommissions._sum.amount || 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Hola 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          Resumen de los últimos 30 días — {workspace.name}
        </p>
      </div>

      {/* Alerta Tiendanube no conectada */}
      {!workspace.tiendanubeConnection && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">Conectá tu tienda Tiendanube</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Para trackear conversiones y crear códigos de descuento automáticamente.
            </p>
          </div>
          <Link
            href="/dashboard/settings?tab=integrations"
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg"
          >
            Conectar <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Clics totales"
          value={formatNumber(stats.clicks)}
          sub="últimos 30 días"
          icon={<MousePointerClick size={16} className="text-brand-500" />}
          bg="bg-brand-50"
        />
        <MetricCard
          label="Clics únicos"
          value={formatNumber(stats.unique_clicks)}
          sub={`${stats.clicks > 0 ? Math.round((stats.unique_clicks / stats.clicks) * 100) : 0}% del total`}
          icon={<TrendingUp size={16} className="text-blue-500" />}
          bg="bg-blue-50"
        />
        <MetricCard
          label="Links activos"
          value={linksCount.toString()}
          sub={`${creatorsCount} creators`}
          icon={<Link2 size={16} className="text-purple-500" />}
          bg="bg-purple-50"
        />
        <MetricCard
          label="Comisiones pendientes"
          value={formatCurrency(pendingAmount)}
          sub="por aprobar"
          icon={<Users size={16} className="text-orange-500" />}
          bg="bg-orange-50"
        />
      </div>

      {/* Links recientes */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Links recientes</h2>
          <Link href="/dashboard/links" className="text-xs text-brand-600 hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentLinks.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-500">Todavía no creaste ningún link.</p>
              <Link
                href="/dashboard/links"
                className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
              >
                Crear primer link →
              </Link>
            </div>
          ) : (
            recentLinks.map((link) => (
              <div key={link.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Link2 size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    kool.link/{link.slug}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{link.destination}</p>
                </div>
                {link.creator && (
                  <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                    {link.creator.name}
                  </span>
                )}
                {link.discountCode && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                    {link.discountCode}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label, value, sub, icon, bg,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode; bg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function OnboardingPrompt() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Zap size={20} className="text-brand-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Configurá tu workspace</h2>
        <p className="text-sm text-gray-500 mb-6">
          Necesitás crear un workspace para empezar a usar Kool.
        </p>
        <Link
          href="/onboarding"
          className="bg-brand-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-500"
        >
          Crear workspace
        </Link>
      </div>
    </div>
  )
}

// Needed for the OnboardingPrompt component
import { Zap } from "lucide-react"
