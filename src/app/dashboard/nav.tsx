"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Link2, BarChart2, Users,
  Megaphone, Gift, Mail, Settings,
} from "lucide-react"

const NAV = [
  { href: "/dashboard",            label: "Home",      icon: LayoutDashboard },
  { href: "/dashboard/links",      label: "Links",     icon: Link2 },
  { href: "/dashboard/analytics",  label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/creators",   label: "Creators",  icon: Users },
  { href: "/dashboard/campaigns",  label: "Campañas",  icon: Megaphone },
  { href: "/dashboard/gifting",    label: "Gifting",   icon: Gift },
  { href: "/dashboard/briefing",   label: "Briefing",  icon: Mail },
  { href: "/dashboard/settings",   label: "Settings",  icon: Settings },
]

// Items principales para el bottom nav mobile (los más usados)
const MOBILE_NAV = [
  { href: "/dashboard",           label: "Home",     icon: LayoutDashboard },
  { href: "/dashboard/links",     label: "Links",    icon: Link2 },
  { href: "/dashboard/creators",  label: "Creators", icon: Users },
  { href: "/dashboard/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/dashboard/settings",  label: "Settings", icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-colors ${
              active
                ? "bg-[#f5f5f5] text-gray-900 font-medium"
                : "text-gray-500 hover:bg-[#f5f5f5] hover:text-gray-900"
            }`}
          >
            <Icon size={14} className={`flex-shrink-0 ${active ? "text-gray-700" : "text-gray-400"}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileDashboardNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#f0f0f0] z-50 flex items-stretch">
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
              active ? "text-gray-900" : "text-gray-400"
            }`}
          >
            <Icon size={20} className={active ? "text-brand-500" : "text-gray-400"} />
            <span className="text-[9px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
