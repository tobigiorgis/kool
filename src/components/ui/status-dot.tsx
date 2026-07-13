import { cn } from "@/lib/utils"

export type DotStatus = "active" | "pending" | "inactive" | "error"

const DOT_COLOR: Record<DotStatus, string> = {
  active: "bg-pink",
  pending: "bg-[#F5A623]",
  inactive: "bg-ink-tertiary",
  error: "bg-[#E5484D]",
}

interface StatusDotProps {
  status: DotStatus
  label?: string
  /** Pulso para actividad en vivo (tracking recibiendo eventos) */
  live?: boolean
  className?: string
}

/** El dot de kool: lenguaje universal de estado en ambos portales. */
export function StatusDot({ status, label, live, className }: StatusDotProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[12px] text-ink-secondary", className)}
    >
      <span
        className={cn(
          "w-[5px] h-[5px] rounded-full shrink-0",
          DOT_COLOR[status],
          live && "kool-dot-pulse"
        )}
      />
      {label}
    </span>
  )
}
