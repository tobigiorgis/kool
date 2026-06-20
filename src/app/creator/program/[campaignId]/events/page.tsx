import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import { SHORT_DOMAIN } from "@/lib/domains"

export default async function EventsPage({
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
  })
  if (!cc) notFound()

  const links = await prisma.link.findMany({
    where: { creatorId: creator.id, campaignId, archived: false },
    select: { id: true, slug: true },
  })
  const linkIds = links.map((l) => l.id)
  const slugMap = new Map(links.map((l) => [l.id, l.slug]))

  const [clicks, conversions] = await Promise.all([
    linkIds.length
      ? prisma.click.findMany({
          where: { linkId: { in: linkIds } },
          orderBy: { timestamp: "desc" },
          take: 100,
        })
      : [],
    prisma.conversion.findMany({
      where: { creatorId: creator.id, link: { campaignId } },
      orderBy: { convertedAt: "desc" },
      take: 50,
      include: { link: { select: { slug: true } } },
    }),
  ])

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Events</h1>
        <p className="text-sm text-gray-400 mt-0.5">Clicks y conversiones recientes</p>
      </div>
      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-2 gap-5">
        {/* Clicks */}
        <div>
          <p className="text-[13px] font-semibold text-gray-900 mb-3">Clicks recientes</p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {clicks.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">Sin clicks todavía.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {clicks.map((click) => (
                  <div key={click.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-mono text-gray-700 truncate">
                        {SHORT_DOMAIN}/{slugMap.get(click.linkId) ?? "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {click.country && (
                          <span className="text-[11px] text-gray-400">{click.country}</span>
                        )}
                        {click.device && (
                          <span className="text-[11px] text-gray-400">{click.device}</span>
                        )}
                        {click.source && (
                          <span className="text-[11px] text-gray-400">{click.source}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                      {formatDate(click.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversions */}
        <div>
          <p className="text-[13px] font-semibold text-gray-900 mb-3">Conversiones recientes</p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {conversions.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">Sin conversiones todavía.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {conversions.map((conv) => (
                  <div key={conv.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-mono text-gray-700 truncate">
                        {SHORT_DOMAIN}/{conv.link?.slug ?? "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        ${conv.orderAmount.toLocaleString("es-AR")} {conv.currency}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                      {formatDate(conv.convertedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
