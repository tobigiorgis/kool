"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "@clerk/nextjs"
import { creatorPath } from "@/lib/host"
import {
  LayoutGrid,
  UserPlus,
  Home,
  Link2,
  DollarSign,
  BarChart3,
  Zap,
  Megaphone,
  Wallet,
  User,
  LogOut,
  ChevronDown,
  Check,
  Search,
} from "lucide-react"

// ─── Mobile bottom nav ───────────────────────────────────────────────────────

function MobileCreatorNav({
  pathname,
  currentCampaignId,
  isInProgram,
  pendingInvites,
}: {
  pathname: string
  currentCampaignId: string | undefined
  isInProgram: boolean
  pendingInvites: number
}) {
  const items = isInProgram && currentCampaignId
    ? [
        { href: creatorPath(`program/${currentCampaignId}`), label: "Overview", icon: Home, active: pathname === creatorPath(`program/${currentCampaignId}`) },
        { href: creatorPath(`program/${currentCampaignId}/links`), label: "Links", icon: Link2, active: pathname.endsWith("/links") },
        { href: creatorPath(`program/${currentCampaignId}/earnings`), label: "Earnings", icon: DollarSign, active: pathname.endsWith("/earnings") },
        { href: creatorPath(`program/${currentCampaignId}/analytics`), label: "Analytics", icon: BarChart3, active: pathname.endsWith("/analytics") },
        { href: creatorPath("profile"), label: "Profile", icon: User, active: pathname.includes("/profile") },
      ]
    : [
        { href: creatorPath("programs"), label: "Programs", icon: LayoutGrid, active: pathname === creatorPath("programs") || pathname === creatorPath("") },
        { href: creatorPath("programs/invitations"), label: "Invites", icon: UserPlus, active: pathname.includes("invitations"), badge: pendingInvites > 0 ? pendingInvites : undefined },
        { href: creatorPath("payouts"), label: "Payouts", icon: Wallet, active: pathname.includes("/payouts") },
        { href: creatorPath("profile"), label: "Profile", icon: User, active: pathname.includes("/profile") },
      ]

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-50 flex items-stretch">
      {items.map(({ href, label, icon: Icon, active, badge }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 relative transition-colors ${active ? "text-gray-900" : "text-gray-400"}`}
        >
          <Icon size={20} className={active ? "text-brand-500" : "text-gray-400"} />
          <span className="text-[9px] font-medium">{label}</span>
          {badge !== undefined && (
            <span className="absolute top-1.5 right-[calc(50%-14px)] text-[9px] font-bold bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
              {badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

interface Program {
  campaignId: string
  campaignName: string
  brandName: string
  brandLogo: string | null
  brandColor: string | null
}

interface Props {
  creatorName: string
  creatorAvatar: string | null
  programs: Program[]
  pendingInvites: number
}

export function CreatorSidebar({ creatorName, creatorAvatar, programs, pendingInvites }: Props) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Tolera el path con o sin prefijo /creator (limpio en prod, prefijado en dev).
  const campaignIdMatch = pathname.match(/\/program\/([^/]+)/)
  const currentCampaignId = campaignIdMatch?.[1]
  const currentProgram = programs.find((p) => p.campaignId === currentCampaignId)
  const isInProgram = !!currentProgram

  const filteredPrograms = programs.filter(
    (p) =>
      p.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
    <MobileCreatorNav
      pathname={pathname}
      currentCampaignId={currentCampaignId}
      isInProgram={isInProgram}
      pendingInvites={pendingInvites}
    />
    <aside className="hidden lg:flex w-[220px] bg-white border-r border-gray-100 flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 h-14 flex items-center border-b border-gray-100">
        <Link href={creatorPath("")} className="flex items-center gap-1">
          <span className="text-[17px] font-bold tracking-tight text-gray-900">kool</span>
          <span className="w-[5px] h-[5px] rounded-full bg-[#00C46A] mb-0.5 ml-0.5" />
        </Link>
      </div>

      {/* Program selector */}
      <div className="px-3 py-2.5 border-b border-gray-100 relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            {isInProgram && currentProgram ? (
              <>
                <BrandAvatar
                  name={currentProgram.brandName}
                  logo={currentProgram.brandLogo}
                  size={22}
                />
                <span className="text-[13px] font-medium text-gray-900 truncate">
                  {currentProgram.brandName}
                </span>
              </>
            ) : (
              <>
                <div className="w-[22px] h-[22px] rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                  <LayoutGrid size={11} className="text-gray-500" />
                </div>
                <span className="text-[13px] font-medium text-gray-900">All programs</span>
              </>
            )}
          </div>
          <ChevronDown size={13} className="text-gray-400 shrink-0" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute top-full left-2 right-2 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 max-h-72 overflow-y-auto">
              <div className="px-2 pb-1.5">
                <div className="relative">
                  <Search
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find program..."
                    className="w-full pl-7 pr-2.5 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                    autoFocus
                  />
                </div>
              </div>

              {filteredPrograms.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <p className="px-3 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Programs
                  </p>
                  {filteredPrograms.map((p) => (
                    <Link
                      key={p.campaignId}
                      href={creatorPath(`program/${p.campaignId}`)}
                      onClick={() => {
                        setDropdownOpen(false)
                        setSearchQuery("")
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] hover:bg-gray-50 mx-1 rounded-lg"
                    >
                      <BrandAvatar name={p.brandName} logo={p.brandLogo} size={18} />
                      <span className="flex-1 truncate">{p.brandName}</span>
                      {currentCampaignId === p.campaignId && (
                        <Check size={13} className="text-brand-500 shrink-0" />
                      )}
                    </Link>
                  ))}
                </>
              )}

              <div className="border-t border-gray-100 my-1" />
              <Link
                href={creatorPath("programs")}
                onClick={() => {
                  setDropdownOpen(false)
                  setSearchQuery("")
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] hover:bg-gray-50 mx-1 rounded-lg"
              >
                <div className="w-[18px] h-[18px] rounded bg-gray-100 flex items-center justify-center shrink-0">
                  <LayoutGrid size={10} className="text-gray-500" />
                </div>
                <span className="flex-1">All programs</span>
                {!isInProgram && <Check size={13} className="text-brand-500 shrink-0" />}
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {!isInProgram ? (
          <>
            <NavItem
              href={creatorPath("programs")}
              icon={LayoutGrid}
              label="Programs"
              active={pathname === creatorPath("programs") || pathname === creatorPath("")}
            />
            <NavItem
              href={creatorPath("programs/invitations")}
              icon={UserPlus}
              label="Invitations"
              active={pathname.includes("invitations")}
              badge={pendingInvites > 0 ? pendingInvites : undefined}
            />
          </>
        ) : (
          <>
            <NavItem
              href={creatorPath(`program/${currentCampaignId}`)}
              icon={Home}
              label="Overview"
              active={pathname === creatorPath(`program/${currentCampaignId}`)}
            />
            <NavItem
              href={creatorPath(`program/${currentCampaignId}/links`)}
              icon={Link2}
              label="Links"
              active={pathname.endsWith("/links")}
            />
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-0.5">
              Insights
            </p>
            <NavItem
              href={creatorPath(`program/${currentCampaignId}/earnings`)}
              icon={DollarSign}
              label="Earnings"
              active={pathname.endsWith("/earnings")}
            />
            <NavItem
              href={creatorPath(`program/${currentCampaignId}/analytics`)}
              icon={BarChart3}
              label="Analytics"
              active={pathname.endsWith("/analytics")}
            />
            <NavItem
              href={creatorPath(`program/${currentCampaignId}/events`)}
              icon={Zap}
              label="Events"
              active={pathname.endsWith("/events")}
            />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-2 space-y-0.5">
        <NavItem href={creatorPath("programs")} icon={Megaphone} label="Programs" active={false} />
        <NavItem
          href={creatorPath("payouts")}
          icon={Wallet}
          label="Payouts"
          active={pathname.includes("/payouts")}
        />
        <NavItem
          href={creatorPath("profile")}
          icon={User}
          label="Profile"
          active={pathname.includes("/profile")}
        />
        <div className="border-t border-gray-50 mt-2 pt-2">
          <SignOutButton>
            <button className="flex items-center gap-3 px-3 py-1.5 text-[13px] text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full">
              <LogOut size={14} />
              Log out
            </button>
          </SignOutButton>
        </div>
      </div>
    </aside>
    </>
  )
}

function BrandAvatar({ name, logo, size }: { name: string; logo: string | null; size: number }) {
  if (logo) {
    return (
      <img
        src={logo}
        className="rounded-md object-cover shrink-0"
        style={{ width: size, height: size }}
        alt={name}
      />
    )
  }
  return (
    <div
      className="rounded-md bg-gray-900 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="text-white font-bold"
        style={{ fontSize: Math.max(8, Math.round(size * 0.44)) }}
      >
        {name[0]?.toUpperCase()}
      </span>
    </div>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-lg transition-colors ${
        active
          ? "text-gray-900 bg-gray-100 font-medium"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <Icon size={14} className={active ? "text-gray-700" : "text-gray-400"} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-semibold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </Link>
  )
}
