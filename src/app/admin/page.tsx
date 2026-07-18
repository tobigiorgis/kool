import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatNumber, formatCurrency } from "@/lib/utils"
import { AdminCharts } from "./AdminCharts"
import Link from "next/link"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

// Format a date as "DD/MM" for weekly labels or "MMM YY" for monthly
function fmtWeek(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

function fmtMonth(d: Date) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

interface PeriodRow {
  period: Date
  count: bigint
}

async function getTimeSeries(table: string, dateCol: string) {
  const weekly = await prisma.$queryRawUnsafe<PeriodRow[]>(`
    SELECT date_trunc('week', "${dateCol}"::timestamp) as period, COUNT(*)::bigint as count
    FROM "${table}"
    WHERE "${dateCol}" >= NOW() - INTERVAL '12 weeks'
    GROUP BY period
    ORDER BY period
  `)

  const monthly = await prisma.$queryRawUnsafe<PeriodRow[]>(`
    SELECT date_trunc('month', "${dateCol}"::timestamp) as period, COUNT(*)::bigint as count
    FROM "${table}"
    WHERE "${dateCol}" >= NOW() - INTERVAL '12 months'
    GROUP BY period
    ORDER BY period
  `)

  return { weekly, monthly }
}

function fillWeeks(rows: PeriodRow[], n = 12) {
  const map = new Map(rows.map((r) => [r.period.toISOString().slice(0, 10), Number(r.count)]))
  const result = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    // Normalize to Monday of that week
    const day = d.getDay()
    d.setDate(d.getDate() - ((day + 6) % 7))
    const key = d.toISOString().slice(0, 10)
    result.push({ label: fmtWeek(d), value: map.get(key) ?? 0 })
  }
  return result
}

function fillMonths(rows: PeriodRow[], n = 12) {
  const map = new Map(rows.map((r) => [r.period.toISOString().slice(0, 7), Number(r.count)]))
  const result = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    result.push({ label: fmtMonth(d), value: map.get(key) ?? 0 })
  }
  return result
}

export default async function AdminPage() {
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  if (email !== ADMIN_EMAIL) redirect("/dashboard")

  const [
    workspacesTotal,
    creatorsTotal,
    creatorsActive,
    campaignsTotal,
    linksTotal,
    clicksTotal,
    conversionsTotal,
    briefingsTotal,
    giftingsTotal,
    bountiesTotal,
    commissionsAgg,
    revenueAgg,
    clicksSeries,
    conversionsSeries,
    creatorsSeries,
    workspacesSeries,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.creator.count(),
    prisma.creator.count({ where: { status: "ACTIVE" } }),
    prisma.campaign.count(),
    prisma.link.count(),
    prisma.click.count(),
    prisma.conversion.count(),
    prisma.briefing.count(),
    prisma.giftingOrder.count(),
    prisma.bounty.count(),
    prisma.commission.aggregate({ _sum: { amount: true } }),
    prisma.conversion.aggregate({ _sum: { orderAmount: true } }),
    getTimeSeries("clicks", "timestamp"),
    getTimeSeries("conversions", "convertedAt"),
    getTimeSeries("creators", "createdAt"),
    getTimeSeries("workspaces", "createdAt"),
  ])

  const totalCommissions = commissionsAgg._sum.amount ?? 0
  const totalRevenue = revenueAgg._sum.orderAmount ?? 0
  const conversionRate = clicksTotal > 0 ? ((conversionsTotal / clicksTotal) * 100).toFixed(2) : "0"

  const weeklyData = {
    clicks: fillWeeks(clicksSeries.weekly),
    conversions: fillWeeks(conversionsSeries.weekly),
    creators: fillWeeks(creatorsSeries.weekly),
    workspaces: fillWeeks(workspacesSeries.weekly),
  }

  const monthlyData = {
    clicks: fillMonths(clicksSeries.monthly),
    conversions: fillMonths(conversionsSeries.monthly),
    creators: fillMonths(creatorsSeries.monthly),
    workspaces: fillMonths(workspacesSeries.monthly),
  }

  const metrics = [
    { label: "Marcas", value: formatNumber(workspacesTotal), color: "#A78BFA", href: "/admin/workspaces" },
    {
      label: "Creators totales",
      value: formatNumber(creatorsTotal),
      sub: `${formatNumber(creatorsActive)} activos`,
      color: "#60A5FA",
      href: "/admin/creators",
    },
    { label: "Campañas", value: formatNumber(campaignsTotal), color: "#34D399" },
    { label: "Links creados", value: formatNumber(linksTotal), color: "#FB7185" },
    {
      label: "Clicks totales",
      value: formatNumber(clicksTotal),
      sub: "desde Postgres",
      color: "#FB7185",
    },
    {
      label: "Conversiones",
      value: formatNumber(conversionsTotal),
      sub: `${conversionRate}% tasa`,
      color: "#34D399",
      href: "/admin/conversions",
    },
    {
      label: "Revenue atribuido",
      value: formatCurrency(totalRevenue),
      sub: "total órdenes",
      color: "#F59E0B",
      href: "/admin/conversions",
    },
    {
      label: "Comisiones generadas",
      value: formatCurrency(totalCommissions),
      sub: "acumuladas",
      color: "#F59E0B",
      href: "/admin/conversions",
    },
    { label: "Briefings", value: formatNumber(briefingsTotal), color: "#6B7280" },
    { label: "Giftings", value: formatNumber(giftingsTotal), color: "#6B7280" },
    { label: "Bounties", value: formatNumber(bountiesTotal), color: "#6B7280" },
  ]

  return (
    <div className="min-h-screen bg-[#F9F9FB] px-4 py-8 lg:px-10 lg:py-12">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-pink-500 uppercase tracking-widest">
              Admin
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Platform overview</h1>
          <p className="text-[13px] text-gray-400 mt-1">Métricas globales de Kool</p>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {metrics.map((m) => {
            const inner = (
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-none">
                  {m.label}
                  {m.href && <span className="ml-1 opacity-40">→</span>}
                </p>
                <p className="font-mono text-2xl font-semibold tracking-tight text-gray-900">
                  {m.value}
                </p>
                {m.sub && <p className="text-[11px] text-gray-400 font-mono">{m.sub}</p>}
                <div className="mt-2 h-1 w-8 rounded-full" style={{ backgroundColor: m.color }} />
              </div>
            )
            return m.href ? (
              <Link
                key={m.label}
                href={m.href}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-px transition-all duration-150"
              >
                {inner}
              </Link>
            ) : (
              <div key={m.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                {inner}
              </div>
            )
          })}
        </div>

        {/* Charts */}
        <AdminCharts weeklyData={weeklyData} monthlyData={monthlyData} />
      </div>
    </div>
  )
}
