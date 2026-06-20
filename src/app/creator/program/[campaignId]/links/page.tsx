import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CopyLinkButton } from "../copy-link-button"
import { ExternalLink } from "lucide-react"
import { SHORT_DOMAIN } from "@/lib/domains"

export default async function LinksPage({
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
    include: { campaign: { include: { workspace: true } } },
  })
  if (!cc) notFound()

  const links = await prisma.link.findMany({
    where: { creatorId: creator.id, campaignId, archived: false },
    include: { _count: { select: { clicks: true, conversions: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Links</h1>
        <p className="text-sm text-gray-400 mt-0.5">{links.length} link{links.length !== 1 ? "s" : ""} activo{links.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="border-t border-gray-200" />

      {links.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-400">No tenés links en este programa todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-mono font-medium text-gray-900">{SHORT_DOMAIN}/{link.slug}</span>
                    {link.title && (
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{link.title}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 truncate">{link.destination}</p>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-[18px] font-semibold text-gray-900">{link._count.clicks.toLocaleString()}</p>
                      <p className="text-[11px] text-gray-400">Clicks</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100" />
                    <div className="text-center">
                      <p className="text-[18px] font-semibold text-gray-900">{link._count.conversions.toLocaleString()}</p>
                      <p className="text-[11px] text-gray-400">Ventas</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100" />
                    <div className="text-center">
                      <p className="text-[18px] font-semibold text-gray-900">
                        {link._count.clicks > 0
                          ? ((link._count.conversions / link._count.clicks) * 100).toFixed(1)
                          : "0.0"}%
                      </p>
                      <p className="text-[11px] text-gray-400">Conv.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://${SHORT_DOMAIN}/${link.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={14} className="text-gray-400" />
                  </a>
                  <CopyLinkButton value={`https://${SHORT_DOMAIN}/${link.slug}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
