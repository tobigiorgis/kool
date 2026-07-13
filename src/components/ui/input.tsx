import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-field bg-surface px-3.5 text-[13px] text-ink",
        "placeholder:text-ink-tertiary",
        "transition-[background-color,box-shadow] duration-fast ease-out-strong",
        "hover:bg-surface-hover",
        "focus:outline-none focus:bg-white focus:shadow-[0_0_0_2px_rgba(251,113,133,0.35)]",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"
