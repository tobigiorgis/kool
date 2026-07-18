import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatNumber, formatCurrency } from "@/lib/utils"
import Link from "next/link"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

export default async function AdminWorkspacesPage() {
  const user = await currentUser()
  if (user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) redirect("/dashboard")

  const workspaces = await prisma.workspace.findMany({
    include: {
      members: { include: { user: { select: { id: true } } } },
      tiendanubeConnection: { select: { active: true, storeName: true } },
      _count: {
        select: {
          creators: true,
          campaigns: true,
          links: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get commission totals per workspace
  const commissionsByWorkspace = await prisma.commission.groupBy({
    by: ["creatorId"],
    _sum: { amount: true },
  })

  // Get creator→workspace map for commissions
  const creators = await prisma.creator.findMany({
    where: { workspaceId: { not: null } },
    select: { id: true, workspaceId: true },
  })
  const creatorWorkspaceMap = new Map(creators.map((c) => [c.id, c.workspaceId]))

  const commissionsByWs = new Map<string, number>()
  for (const row of commissionsByWorkspace) {
    const wsId = creatorWorkspaceMap.get(row.creatorId)
    if (!wsId) continue
    commissionsByWs.set(wsId, (commissionsByWs.get(wsId) ?? 0) + (row._sum.amount ?? 0))
  }

  return (
    <div className="min-h-screen bg-[#F9F9FB] px-4 py-8 lg:px-10 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
            ← Admin
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Marcas</h1>
          <span className="ml-auto text-[12px] font-mono text-gray-400">{workspaces.length} total</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Marca</th>
                  <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Tiendanube</th>
                  <th className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Creators</th>
                  <th className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Campañas</th>
                  <th className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Links</th>
                  <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Comisiones</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws, i) => {
                  const tn = ws.tiendanubeConnection
                  return (
                    <tr key={ws.id} className={i < workspaces.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-medium text-gray-900">{ws.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{ws.slug}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {tn ? (
                          <div>
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${tn.active ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tn.active ? "bg-green-500" : "bg-gray-300"}`} />
                              {tn.active ? "Conectada" : "Inactiva"}
                            </span>
                            {tn.storeName && <p className="text-[11px] text-gray-400 mt-0.5">{tn.storeName}</p>}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-[13px] text-gray-700">{formatNumber(ws._count.creators)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-[13px] text-gray-700">{formatNumber(ws._count.campaigns)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-[13px] text-gray-700">{formatNumber(ws._count.links)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-mono text-[13px] font-medium text-gray-900">
                          {formatCurrency(commissionsByWs.get(ws.id) ?? 0)}
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
