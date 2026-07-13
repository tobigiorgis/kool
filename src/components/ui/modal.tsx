"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

/** Modal centrado: scale 0.97→1 + fade, 180ms. Los modales escalan desde el centro. */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-6">
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
          "relative bg-white shadow-overlay w-full flex flex-col max-h-[92dvh]",
          "rounded-t-[20px] animate-slide-up",
          "lg:max-w-md lg:rounded-[20px] lg:animate-scale-in",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-1 shrink-0">
            <h2 className="text-[15px] font-medium text-ink tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-7 h-7 rounded-full bg-surface hover:bg-surface-hover flex items-center justify-center text-ink-secondary transition-colors duration-fast pressable"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
