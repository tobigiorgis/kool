"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Ancho del panel en desktop */
  className?: string
}

/**
 * Slide-over lateral (desktop) / bottom sheet (mobile).
 * Curva de drawer iOS, backdrop con fade, Escape para cerrar.
 */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink/20 animate-overlay-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute bg-white shadow-overlay flex flex-col",
          // Mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[20px] animate-slide-up",
          // Desktop: panel lateral
          "lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto lg:h-full lg:w-[440px] lg:max-h-none lg:rounded-none lg:rounded-l-[20px] lg:animate-slide-in-right",
          className
        )}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
          <h2 className="text-[15px] font-medium text-ink tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-7 h-7 rounded-full bg-surface hover:bg-surface-hover flex items-center justify-center text-ink-secondary transition-colors duration-fast pressable"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}
