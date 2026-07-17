"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "@clerk/nextjs"
import { creatorPath } from "@/lib/host"
import { Home, Link2, UserPlus, Wallet, User, LogOut } from "lucide-react"

interface Props {
  creatorName: string
  creatorAvatar: string | null
  programs: unknown[]
  pendingInvites: number
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
      className={`flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-pill transition-colors duration-fast ease-out-strong ${
        active
          ? "text-ink bg-pink-fill font-medium"
          : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
      }`}
    >
      <Icon size={14} strokeWidth={1.5} className={active ? "text-pink-deep" : "text-ink-tertiary"} />
      <span className="flex-1">{label}</span>
      {active && badge === undefined && <span className="kool-dot" style={{ width: 4, height: 4 }} />}
      {badge !== undefined && (
        <span className="text-[10px] font-medium bg-pink text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center tnum">
          {badge}
        </span>
      )}
    </Link>
  )
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

function MobileCreatorNav({ pathname, pendingInvites }: { pathname: string; pendingInvites: number }) {
  const items = [
    { href: creatorPath(""), label: "Overview", icon: Home, active: pathname === creatorPath("") || pathname === creatorPath("/") },
    { href: creatorPath("links"), label: "Links", icon: Link2, active: pathname.includes("/links") && !pathname.includes("/program/") },
    { href: creatorPath("programs/invitations"), label: "Invites", icon: UserPlus, active: pathname.includes("invitations"), badge: pendingInvites > 0 ? pendingInvites : undefined },
    { href: creatorPath("earnings"), label: "Earnings", icon: Wallet, active: pathname.includes("/earnings") && !pathname.includes("/program/") },
    { href: creatorPath("profile"), label: "Profile", icon: User, active: pathname.includes("/profile") },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl shadow-[0_-1px_0_#F5F4F4] z-50 flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {items.map(({ href, label, icon: Icon, active, badge }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 relative transition-colors duration-fast ${active ? "text-ink" : "text-ink-tertiary"}`}
        >
          <Icon size={20} strokeWidth={1.5} className={active ? "text-pink" : "text-ink-tertiary"} />
          <span className="text-[9px] font-medium">{label}</span>
          {badge !== undefined && (
            <span className="absolute top-1.5 right-[calc(50%-14px)] text-[9px] font-semibold bg-pink text-white rounded-full w-4 h-4 flex items-center justify-center">
              {badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function CreatorSidebar({ pendingInvites }: Props) {
  const pathname = usePathname()

  const isOverview = pathname === creatorPath("") || pathname === creatorPath("/")
  const isLinks = pathname.includes("/links") && !pathname.includes("/program/")
  const isInvites = pathname.includes("invitations")
  const isEarnings = (pathname.includes("/earnings") || pathname.includes("/payouts")) && !pathname.includes("/program/")
  const isProfile = pathname.includes("/profile")

  return (
    <>
      <MobileCreatorNav pathname={pathname} pendingInvites={pendingInvites} />
      <aside className="hidden lg:flex w-[220px] bg-surface flex-col h-full shrink-0">
        {/* Logo */}
        <div className="px-4 h-14 flex items-center">
          <Link href={creatorPath("")} className="flex items-center gap-1">
            <span className="text-[17px] font-medium tracking-[-0.03em] text-ink">kool</span>
            <span className="kool-dot mb-0.5 ml-0.5" />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <NavItem href={creatorPath("")} icon={Home} label="Overview" active={isOverview} />
          <NavItem href={creatorPath("links")} icon={Link2} label="Links" active={isLinks} />
          <NavItem
            href={creatorPath("programs/invitations")}
            icon={UserPlus}
            label="Invites"
            active={isInvites}
            badge={pendingInvites > 0 ? pendingInvites : undefined}
          />
          <NavItem href={creatorPath("earnings")} icon={Wallet} label="Earnings" active={isEarnings} />
          <NavItem href={creatorPath("profile")} icon={User} label="Profile" active={isProfile} />
        </nav>

        {/* Footer */}
        <div className="border-t border-hairline p-2">
          <div className="border-t border-hairline pt-2">
            <SignOutButton>
              <button className="flex items-center gap-3 px-3 py-1.5 text-[13px] text-ink-secondary hover:text-[#E5484D] hover:bg-[#FEF2F2] rounded-pill transition-colors duration-fast w-full">
                <LogOut size={14} strokeWidth={1.5} />
                Log out
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>
    </>
  )
}
