import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
}

const TIER_COLOR: Record<string, string> = {
  BRONZE: "bg-orange-50 text-orange-700",
  SILVER: "bg-gray-50 text-gray-600",
  GOLD: "bg-yellow-50 text-yellow-700",
  PLATINUM: "bg-purple-50 text-purple-700",
}

interface ClickRow {
  creatorId: string
  count: bigint
}

export default async function AdminCreatorsPage() {
  const user = await currentUser()
  if (user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) redirect("/dashboard")

  const [creators, clickRows] = await Promise.all([
    prisma.creator.findMany({
      include: {
        workspace: { select: { name: true, slug: true } },
        _count: {
          select: {
            links: true,
            conversions: true,
            campaigns: true,
          },
        },
        commissions: {
          select: { amount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRaw<ClickRow[]>`
      SELECT l."creatorId", COUNT(c.id)::bigint as count
      FROM links l
      LEFT JOIN clicks c ON c."linkId" = l.id
      WHERE l."creatorId" IS NOT NULL
      GROUP BY l."creatorId"
    `,
  ])

  const clicksByCreator = new Map(clickRows.map((r) => [r.creatorId, Number(r.count)]))

  return (
    <div className="min-h-screen bg-[#F9F9FB] px-4 py-8 lg:px-10 lg:py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
            ← Admin
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Creators</h1>
          <span className="ml-auto text-[12px] font-mono text-gray-400">{creators.length} total</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Creator</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Marca</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Código</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Redes</th>
                  <th className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Clicks</th>
                  <th className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Ventas</th>
                  <th className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Perfil</th>
                  <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Comisiones</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((c, i) => {
                  const totalCommissions = c.commissions.reduce((sum, cm) => sum + cm.amount, 0)
                  const clicks = clicksByCreator.get(c.id) ?? 0
                  return (
                    <tr key={c.id} className={i < creators.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-medium text-gray-500 shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-gray-900">{c.name}</p>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TIER_COLOR[c.tier] ?? "bg-gray-50 text-gray-500"}`}>
                                {TIER_LABEL[c.tier] ?? c.tier}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {c.workspace ? (
                          <p className="text-[12px] text-gray-700">{c.workspace.name}</p>
                        ) : (
                          <span className="text-[11px] text-gray-300">Sin marca</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.discountCode ? (
                          <span className="font-mono text-[11px] bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded">
                            {c.discountCode}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          {c.instagram && (
                            <span className="text-[11px] text-gray-500">
                              @{c.instagram}
                              {c.instagramFollowers && (
                                <span className="text-gray-400 ml-1">({(c.instagramFollowers / 1000).toFixed(0)}k)</span>
                              )}
                            </span>
                          )}
                          {c.tiktok && (
                            <span className="text-[11px] text-gray-500">
                              @{c.tiktok}
                              {c.tiktokFollowers && (
                                <span className="text-gray-400 ml-1">({(c.tiktokFollowers / 1000).toFixed(0)}k)</span>
                              )}
                            </span>
                          )}
                          {!c.instagram && !c.tiktok && (
                            <span className="text-[11px] text-gray-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-[13px] text-gray-700">{clicks}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-[13px] text-gray-700">{c._count.conversions}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {c.profileCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                            ✓ Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-mono text-[13px] font-medium ${totalCommissions > 0 ? "text-green-700" : "text-gray-300"}`}>
                          {totalCommissions > 0 ? formatCurrency(totalCommissions) : "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
