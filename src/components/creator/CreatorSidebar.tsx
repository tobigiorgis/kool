"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Link2,
  DollarSign,
  BarChart2,
  Activity,
  ChevronDown,
  HelpCircle,
} from "lucide-react"

interface Program {
  creatorId: string
  workspaceId: string
  workspaceName: string
  workspaceLogo: string | null
  commissionPct: number
  discountCode: string | null
}

interface CreatorSidebarProps {
  programs: Program[]
}

const navItems = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Links", href: "/links", icon: Link2 },
  { label: "Ganancias", href: "/earnings", icon: DollarSign },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Eventos", href: "/events", icon: Activity },
]

export default function CreatorSidebar({ programs }: CreatorSidebarProps) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Extract workspaceId from path /creator/program/[workspaceId]/...
  const match = pathname.match(/\/creator\/program\/([^/]+)/)
  const currentWorkspaceId = match ? match[1] : null
  const currentProgram = programs.find((p) => p.workspaceId === currentWorkspaceId)

  const baseHref = currentProgram
    ? `/creator/program/${currentProgram.workspaceId}`
    : null

  function isActive(href: string) {
    if (!baseHref) return false
    const full = `${baseHref}${href}`
    if (href === "") {
      return pathname === baseHref
    }
    return pathname.startsWith(full)
  }

  return (
    <aside
      style={{ width: 224, minWidth: 224 }}
      className="h-screen sticky top-0 flex flex-col bg-white border-r border-gray-100 overflow-y-auto"
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-1.5 border-b border-gray-100">
        <Link href="/creator" className="flex items-center gap-1.5">
          <span className="text-lg font-bold tracking-tight text-gray-900">kool</span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#F8BBD0" }}
          />
        </Link>
      </div>

      {/* Program selector */}
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            {currentProgram ? (
              <>
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: "#F8BBD0" }}
                >
                  {currentProgram.workspaceLogo ? (
                    <img
                      src={currentProgram.workspaceLogo}
                      alt=""
                      className="w-full h-full rounded-md object-cover"
                    />
                  ) : (
                    currentProgram.workspaceName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 truncate flex-1">
                  {currentProgram.workspaceName}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-500 flex-1">Todos los programas</span>
            )}
            <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
              <Link
                href="/creator"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-600">Todos los programas</span>
              </Link>
              {programs.map((p) => (
                <Link
                  key={p.workspaceId}
                  href={`/creator/program/${p.workspaceId}`}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: "#F8BBD0" }}
                  >
                    {p.workspaceLogo ? (
                      <img src={p.workspaceLogo} alt="" className="w-full h-full rounded object-cover" />
                    ) : (
                      p.workspaceName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm text-gray-800 truncate">{p.workspaceName}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {currentProgram && baseHref ? (
          navItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={`${baseHref}${href}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-gray-50 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={15} className={active ? "text-gray-700" : "text-gray-400"} />
                {label}
              </Link>
            )
          })
        ) : (
          <p className="px-3 py-2 text-xs text-gray-400">
            Seleccioná un programa para navegar
          </p>
        )}
      </nav>

      {/* Help & Support */}
      {currentProgram && (
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
            <HelpCircle size={13} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Soporte</span>
          </div>
          <Link
            href="/creator"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            Mis programas
          </Link>
        </div>
      )}
    </aside>
  )
}
