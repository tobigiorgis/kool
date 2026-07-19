"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Link2,
  BarChart2,
  Users,
  Megaphone,
  Gift,
  Mail,
  Settings,
  Handshake,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/links", label: "Links", icon: Link2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/creators", label: "Creators", icon: Users },
  { href: "/dashboard/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/dashboard/gifting", label: "Gifting", icon: Gift },
  { href: "/dashboard/briefing", label: "Briefing", icon: Mail },
  { href: "/dashboard/collaborations", label: "Colaboraciones", icon: Handshake },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

// Items principales para el bottom nav mobile (los más usados)
const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/links", label: "Links", icon: Link2 },
  { href: "/dashboard/creators", label: "Creators", icon: Users },
  { href: "/dashboard/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <nav className="flex-1 px-2.5 py-3 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-pill",
              "transition-colors duration-fast ease-out-strong",
              active
                ? "bg-pink-fill text-ink font-medium"
                : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
            )}
          >
            <Icon
              size={14}
              strokeWidth={1.5}
              className={cn("shrink-0", active ? "text-pink-deep" : "text-ink-tertiary")}
            />
            {label}
            {active && (
              <span className="kool-dot ml-auto w-1 h-1" style={{ width: 4, height: 4 }} />
            )}
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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl shadow-[0_-1px_0_#F5F4F4] z-50 flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2",
              "transition-colors duration-fast",
              active ? "text-ink" : "text-ink-tertiary"
            )}
          >
            <Icon
              size={20}
              strokeWidth={1.5}
              className={active ? "text-pink" : "text-ink-tertiary"}
            />
            <span className="text-[9px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
