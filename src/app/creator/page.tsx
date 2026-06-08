import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils/index"
import { ArrowRight, Tag, Bell, Check, X } from "lucide-react"
import { PendingInvites } from "./pending-invites"

export default async function CreatorHomePage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  // Get all creator records for this user
  let creators = await prisma.creator.findMany({
    where: { userId },
    include: {
      workspace: true,
      commissions: {
        where: { status: { in: ["PENDING", "APPROVED", "PAID"] } },
      },
      invites: {
        where: { status: "PENDING" },
        include: {
          campaign: {
            select: { id: true, name: true, workspace: { select: { name: true, brandLogo: true, brandColor: true } } },
          },
        },
      },
    },
  })

  if (creators.length === 0) {
    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses[0]?.emailAddress
    if (email) {
      creators = await prisma.creator.findMany({
        where: { email, status: "ACTIVE" },
        include: {
          workspace: true,
          commissions: {
            where: { status: { in: ["PENDING", "APPROVED", "PAID"] } },
          },
          invites: {
            where: { status: "PENDING" },
            include: {
              campaign: {
                select: { id: true, name: true, workspace: { select: { name: true, brandLogo: true, brandColor: true } } },
              },
            },
          },
        },
      })
    }
  }

  if (creators.length === 0) redirect("/onboarding/creator")

  // Collect all pending invites across creator profiles
  const pendingInvites = creators.flatMap((c) =>
    c.invites.map((inv) => ({
      id: inv.id,
      campaignId: inv.campaign.id,
      campaignName: inv.campaign.name,
      brandName: inv.campaign.workspace.name,
      brandLogo: inv.campaign.workspace.brandLogo,
      brandColor: inv.campaign.workspace.brandColor,
      discountCode: c.discountCode,
      commissionPct: c.commissionPct,
    }))
  )

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Mis programas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Seleccioná un programa para ver tus links, ganancias y analytics.
          </p>
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Invitaciones pendientes
              </h2>
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                {pendingInvites.length}
              </span>
            </div>
            <PendingInvites invites={pendingInvites} />
          </div>
        )}

        {/* Active programs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {creators.map((creator) => {
            const totalEarnings = creator.commissions.reduce(
              (sum, c) => sum + c.amount,
              0
            )
            const initials = creator.workspace.name.slice(0, 2).toUpperCase()

            return (
              <Link
                key={creator.id}
                href={`/creator/program/${creator.workspaceId}`}
                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: "#F8BBD0" }}
                    >
                      {creator.workspace.brandLogo ?? creator.workspace.logo ? (
                        <img
                          src={(creator.workspace.brandLogo ?? creator.workspace.logo)!}
                          alt=""
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        <span className="text-gray-700">{initials}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {creator.workspace.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {creator.commissionPct}% comisión
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1"
                  />
                </div>

                <div className="space-y-2">
                  {creator.discountCode && (
                    <div className="flex items-center gap-1.5">
                      <Tag size={12} className="text-gray-400" />
                      <span className="text-xs font-mono text-gray-600">
                        {creator.discountCode}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(totalEarnings)}
                    </span>
                    <span className="text-xs text-gray-400">ganancias totales</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
