import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { UserButton } from "@clerk/nextjs"
import { DashboardNav } from "./nav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  // Auto-activar drops cuya fecha de lanzamiento ya pasó
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/drops/check-status`, {
    method: "POST",
    cache: "no-store",
  }).catch(() => {})

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 border-r border-[#f0f0f0] flex flex-col bg-white">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#f0f0f0]">
          <Link href="/dashboard" className="flex items-center gap-1">
            <span className="text-[17px] font-semibold tracking-tight text-gray-900">kool</span>
            <span className="w-[5px] h-[5px] rounded-full bg-brand-400 mb-0.5 ml-0.5" />
          </Link>
        </div>

        {/* Nav */}
        <DashboardNav />

        {/* Footer */}
        <div className="px-4 py-4 border-t border-[#f0f0f0] flex items-center gap-2.5">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0">
            <Link
              href="/dashboard/settings?tab=billing"
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Plan Free · Upgrade
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-white">
        {children}
      </main>
    </div>
  )
}
