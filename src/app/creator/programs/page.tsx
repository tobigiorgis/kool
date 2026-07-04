import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { Tag, ArrowRight } from "lucide-react"
import { shortUrlLabel } from "@/lib/links"
import { creatorPath } from "@/lib/host"

export default async function AllProgramsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({ where: { userId } })
  if (!creator) redirect("/onboarding/creator")

  const [campaignCreators, pendingInvites] = await Promise.all([
    prisma.campaignCreator.findMany({
      where: { creatorId: creator.id, status: "ACCEPTED" },
      include: { campaign: { include: { workspace: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaignInvite.findMany({
      where: { creatorId: creator.id, status: "PENDING" },
      include: { campaign: { include: { workspace: true } } },
      orderBy: { sentAt: "desc" },
    }),
  ])

  const programs = await Promise.all(
    campaignCreators.map(async (cc) => {
      const [earnings, links] = await Promise.all([
        prisma.commission.aggregate({
          where: { creatorId: creator.id },
          _sum: { amount: true },
        }),
        prisma.link.findMany({
          where: { creatorId: creator.id, campaignId: cc.campaignId, archived: false },
          select: { id: true, slug: true },
        }),
      ])
      return {
        campaignId: cc.campaignId,
        campaignName: cc.campaign.name,
        brandName: cc.campaign.workspace.name,
        brandLogo: cc.campaign.workspace.brandLogo,
        brandColor: cc.campaign.workspace.brandColor,
        discountCode: cc.discountCode ?? creator.discountCode,
        commissionPct: cc.commissionPct ?? creator.commissionPct,
        totalEarnings: earnings._sum.amount ?? 0,
        links,
      }
    })
  )

  const [featured, ...rest] = programs

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Programs</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {programs.length} programa{programs.length !== 1 ? "s" : ""} activo{programs.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="border-t border-gray-200 mb-6" />

      {programs.length === 0 && pendingInvites.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-400">No estás en ningún programa todavía.</p>
          <p className="text-xs text-gray-300 mt-1">Revisá tu email para invitaciones pendientes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Featured — programa más reciente */}
          {featured && (
            <Link
              href={creatorPath(`program/${featured.campaignId}`)}
              className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <BrandLogo name={featured.brandName} logo={featured.brandLogo} color={featured.brandColor} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-gray-900">{featured.brandName}</p>
                  <p className="text-xs text-gray-400">{featured.campaignName}</p>
                </div>
                <ArrowRight size={16} className="text-gray-300 shrink-0" />
              </div>

              {featured.links[0] && (
                <p className="text-xs text-gray-400 font-mono mb-3">{shortUrlLabel(featured.links[0].slug)}</p>
              )}

              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Earnings</p>
                  <p className="text-[20px] font-semibold text-gray-900 tracking-tight">
                    {formatCurrency(featured.totalEarnings)}
                  </p>
                </div>
                <div className="text-right">
                  {featured.discountCode && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 justify-end">
                      <Tag size={10} />
                      <span className="font-mono font-medium">{featured.discountCode}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">{featured.commissionPct}% comisión</p>
                </div>
              </div>
            </Link>
          )}

          {/* Pending invitations */}
          {pendingInvites.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium text-gray-900">
                  Invitaciones pendientes
                  <span className="ml-2 text-[11px] font-semibold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
                    {pendingInvites.length}
                  </span>
                </p>
                <Link
                  href={creatorPath("programs/invitations")}
                  className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Ver todas →
                </Link>
              </div>
              <div className="space-y-2">
                {pendingInvites.map((inv) => (
                  <Link
                    key={inv.id}
                    href={creatorPath("programs/invitations")}
                    className="flex items-center gap-3 bg-white rounded-xl border border-amber-100 bg-amber-50/30 p-4 hover:border-amber-200 transition-colors"
                  >
                    <BrandLogo
                      name={inv.campaign.workspace.name}
                      logo={inv.campaign.workspace.brandLogo}
                      color={inv.campaign.workspace.brandColor}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900">{inv.campaign.workspace.name}</p>
                      <p className="text-[11px] text-gray-400">{inv.campaign.name}</p>
                    </div>
                    <span className="text-[11px] font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                      Pendiente
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Remaining programs */}
          {rest.length > 0 && (
            <div>
              {featured && <p className="text-[13px] font-medium text-gray-900 mb-3">Otros programas</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rest.map((p) => (
                  <Link
                    key={p.campaignId}
                    href={creatorPath(`program/${p.campaignId}`)}
                    className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-3"
                  >
                    <BrandLogo name={p.brandName} logo={p.brandLogo} color={p.brandColor} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900">{p.brandName}</p>
                      <p className="text-[11px] text-gray-400">{formatCurrency(p.totalEarnings)} ganados</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BrandLogo({
  name, logo, color, size,
}: {
  name: string; logo: string | null; color: string | null; size: number
}) {
  if (logo) {
    return <img src={logo} className="rounded-xl object-cover shrink-0" style={{ width: size, height: size }} alt={name} />
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: color ?? "#111827" }}
    >
      <span className="text-white font-bold" style={{ fontSize: Math.round(size * 0.45) }}>
        {name[0]?.toUpperCase()}
      </span>
    </div>
  )
}
