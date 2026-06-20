import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { Tag } from "lucide-react"

export default async function AllProgramsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({ where: { userId } })
  if (!creator) redirect("/onboarding/creator")

  const campaignCreators = await prisma.campaignCreator.findMany({
    where: { creatorId: creator.id, status: "ACCEPTED" },
    include: {
      campaign: {
        include: { workspace: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Fetch earnings per program
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Programs</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {programs.length} programa{programs.length !== 1 ? "s" : ""} activo{programs.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="border-t border-gray-200 mb-6" />

      {programs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-400">No estás en ningún programa todavía.</p>
          <p className="text-xs text-gray-300 mt-1">Revisá tu email para invitaciones pendientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map((p) => {
            const firstLink = p.links[0]
            return (
              <Link
                key={p.campaignId}
                href={`/creator/program/${p.campaignId}`}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                {/* Brand logo */}
                <div className="mb-4">
                  <BrandLogo name={p.brandName} logo={p.brandLogo} color={p.brandColor} size={40} />
                </div>

                <p className="text-[15px] font-semibold text-gray-900">{p.brandName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.campaignName}</p>

                {firstLink && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <span className="font-mono">{process.env.NEXT_PUBLIC_SHORT_DOMAIN || "joinkool.co"}/{firstLink.slug}</span>
                  </p>
                )}

                {/* Earnings + discount */}
                <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-400 mb-0.5">Earnings</p>
                    <p className="text-[17px] font-semibold text-gray-900 tracking-tight">
                      {formatCurrency(p.totalEarnings)}
                    </p>
                  </div>
                  <div className="text-right">
                    {p.discountCode && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Tag size={10} />
                        <span className="font-mono font-medium">{p.discountCode}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.commissionPct}% comisión</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BrandLogo({ name, logo, color, size }: { name: string; logo: string | null; color: string | null; size: number }) {
  if (logo) {
    return <img src={logo} className="rounded-xl object-cover" style={{ width: size, height: size }} alt={name} />
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center"
      style={{ width: size, height: size, backgroundColor: color ?? "#111827" }}
    >
      <span className="text-white font-bold" style={{ fontSize: Math.round(size * 0.45) }}>
        {name[0]?.toUpperCase()}
      </span>
    </div>
  )
}
