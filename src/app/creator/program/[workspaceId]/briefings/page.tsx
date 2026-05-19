import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FileText, Paperclip, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils/index"

export default async function ProgramBriefingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const creator = await prisma.creator.findFirst({
    where: { workspaceId, userId },
  })
  if (!creator) notFound()

  const recipients = await prisma.briefingRecipient.findMany({
    where: {
      creatorId: creator.id,
      briefing: { status: "SENT" },
    },
    orderBy: { briefing: { sentAt: "desc" } },
    include: {
      briefing: {
        select: {
          id: true,
          subject: true,
          body: true,
          campaignName: true,
          startDate: true,
          endDate: true,
          assets: true,
          sentAt: true,
        },
      },
    },
  })

  const briefings = recipients.map((r) => r.briefing)

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Briefings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Instrucciones y materiales de campaña de la marca
          </p>
        </div>

        {briefings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#F8BBD0" }}
            >
              <FileText size={20} className="text-gray-700" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              No hay briefings todavía
            </p>
            <p className="text-xs text-gray-400">
              Cuando la marca te envíe un brief de campaña, aparecerá acá.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {briefings.map((b) => {
              const assets = (b.assets as { name: string; url: string; type: string }[] | null) ?? []

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-gray-100 p-6"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: "#F8BBD0" }}
                    >
                      <FileText size={15} className="text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{b.subject}</p>
                      {b.campaignName && (
                        <p className="text-xs text-gray-400 mt-0.5">{b.campaignName}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {b.sentAt && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar size={11} />
                            {formatDate(new Date(b.sentAt))}
                          </span>
                        )}
                        {b.startDate && b.endDate && (
                          <span className="text-xs text-gray-400">
                            Campaña: {formatDate(new Date(b.startDate))} — {formatDate(new Date(b.endDate))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {b.body}
                    </p>
                  </div>

                  {/* Assets */}
                  {assets.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Archivos adjuntos</p>
                      <div className="flex flex-wrap gap-2">
                        {assets.map((a, i) => (
                          <a
                            key={i}
                            href={`/api/files?url=${encodeURIComponent(a.url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <Paperclip size={11} />
                            {a.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
