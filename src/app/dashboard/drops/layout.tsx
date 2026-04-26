"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/dashboard/drops", label: "Drops" },
  { href: "/dashboard/drops/profitability", label: "Rentabilidad" },
]

export default function DropsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard/drops"
      ? pathname === "/dashboard/drops" || pathname.startsWith("/dashboard/drops/") && !pathname.startsWith("/dashboard/drops/profitability")
      : pathname.startsWith(href)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[#f0f0f0] px-8 flex items-center gap-0">
        {TABS.map(({ href, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-[#00C46A] text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
