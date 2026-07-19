import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { CollaborationAcceptor } from "./CollaborationAcceptor"

export default async function CollaborationsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const { token } = await searchParams

  const collaborations = await prisma.campaignCollaborator.findMany({
    where: { userId, status: { in: ["PENDING", "ACCEPTED"] } },
    include: {
      campaign: {
        include: {
          workspace: { select: { name: true, logo: true } },
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  })

  const ROLE_LABEL = { EDITOR: "Editor", VIEWER: "Viewer" }
  const ROLE_COLOR = {
    EDITOR: "bg-indigo-50 text-indigo-700",
    VIEWER: "bg-gray-100 text-gray-600",
  }
  const STATUS_LABEL = { PENDING: "Pendiente", ACCEPTED: "Aceptada", DECLINED: "Rechazada" }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:px-8 lg:py-10 animate-fade-up">
      {/* Accept token if present */}
      {token && <CollaborationAcceptor token={token} />}

      <div className="mb-8">
        <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">Colaboraciones</h1>
        <p className="text-[13px] text-ink-tertiary mt-0.5">
          Campañas en las que fuiste invitado a colaborar
        </p>
      </div>

      {collaborations.length === 0 ? (
        <div className="bg-surface rounded-card px-5 py-16 text-center">
          <p className="text-[13px] text-ink-secondary">
            Todavía no tenés colaboraciones asignadas.
          </p>
          <p className="text-[12px] text-ink-tertiary mt-1">
            Cuando una marca te invite a colaborar en una campaña, aparecerá acá.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collaborations.map((c) => (
            <Link
              key={c.id}
              href={
                c.status === "ACCEPTED" ? `/dashboard/campaigns/${c.campaignId}` : "#"
              }
              className={`bg-white shadow-card rounded-card p-5 transition-[box-shadow,transform] duration-base ease-out-strong ${
                c.status === "ACCEPTED"
                  ? "hover:shadow-card-hover hover:-translate-y-px"
                  : "cursor-default opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink leading-snug truncate">
                    {c.campaign.name}
                  </p>
                  <p className="text-[11px] text-ink-tertiary mt-0.5">
                    {c.campaign.workspace.name}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[c.role]}`}
                >
                  {ROLE_LABEL[c.role]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-tertiary">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    c.status === "ACCEPTED" ? "bg-green-500" : "bg-amber-400"
                  }`}
                />
                {STATUS_LABEL[c.status]}
                <span className="opacity-40">·</span>
                <span>
                  {new Date(c.invitedAt).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
