import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { UserButton } from "@clerk/nextjs"
import { prisma } from "@/lib/prisma"
import { creatorUrl } from "@/lib/host"
import { DashboardNav, MobileDashboardNav } from "./nav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  // Canonicalización: un creator (sin workspace) que cayó en el host de la app
  // → su portal. No afecta a marcas mid-onboarding (no tienen fila creator).
  const member = await prisma.workspaceMember.findFirst({ where: { userId }, select: { id: true } })
  if (!member) {
    const creator = await prisma.creator.findFirst({ where: { userId }, select: { id: true } })
    if (creator) redirect(creatorUrl(""))
  }

  // Auto-activar drops cuya fecha de lanzamiento ya pasó
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/drops/check-status`, {
    method: "POST",
    cache: "no-store",
  }).catch(() => {})

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar — solo desktop */}
      <aside className="hidden lg:flex w-[220px] flex-shrink-0 flex-col bg-surface">
        {/* Logo */}
        <div className="h-14 flex items-center px-5">
          <Link href="/dashboard" className="flex items-center gap-1">
            <span className="text-[17px] font-medium tracking-[-0.03em] text-ink">kool</span>
            <span className="kool-dot mb-0.5 ml-0.5" />
          </Link>
        </div>

        {/* Nav */}
        <DashboardNav />

        {/* Footer */}
        <div className="px-4 py-4 flex items-center gap-2.5">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0">
            <Link
              href="/dashboard/settings?tab=billing"
              className="text-[11px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-fast"
            >
              Plan Free · Upgrade
            </Link>
          </div>
        </div>
      </aside>

      {/* Main — padding bottom en mobile para el nav bar */}
      <main className="flex-1 overflow-auto bg-white pb-16 lg:pb-0">{children}</main>

      {/* Bottom nav — solo mobile */}
      <MobileDashboardNav />
    </div>
  )
}
