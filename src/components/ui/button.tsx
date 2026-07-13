import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger"
type Size = "sm" | "md"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANTS: Record<Variant, string> = {
  // Un solo primary por vista: el momento rosa
  primary: "bg-pink text-white hover:bg-pink-strong shadow-pill",
  secondary: "bg-white text-ink shadow-pill hover:bg-surface",
  soft: "bg-pink-fill text-pink-deep hover:bg-pink-fill-hover",
  ghost: "text-ink-secondary hover:text-ink hover:bg-surface",
  danger: "bg-white text-[#E5484D] shadow-pill hover:bg-[#FEF2F2]",
}

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[12.5px] gap-1.5",
  md: "h-9 px-4 text-[13px] gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-pill font-medium select-none",
        "transition-[background-color,transform] duration-press ease-out-strong",
        "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/40",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = "Button"
