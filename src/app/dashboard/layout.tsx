import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import {
  LayoutDashboard, Link2, BarChart2, Users,
  Gift, Mail, Settings, Zap,
} from "lucide-react"

const NAV = [
  { href: "/dashboard",           label: "Inicio",    icon: LayoutDashboard },
  { href: "/dashboard/links",     label: "Links",     icon: Link2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/creators",  label: "Creators",  icon: Users },
  { href: "/dashboard/gifting",   label: "Gifting",   icon: Gift },
  { href: "/dashboard/briefing",  label: "Briefing",  icon: Mail },
  { href: "/dashboard/settings",  label: "Settings",  icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-gray-900">kool</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mb-0.5" />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors group"
            >
              <Icon size={16} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Plan badge */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 rounded-lg mb-3">
            <Zap size={14} className="text-brand-500" />
            <span className="text-xs font-medium text-brand-700">Plan Free</span>
            <Link href="/dashboard/settings?tab=billing" className="ml-auto text-xs text-brand-600 hover:underline">
              Upgrade
            </Link>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
