import { type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Levanta la sombra al hover (para cards clickeables) */
  interactive?: boolean
  /** Fill suave en vez de blanco con sombra */
  soft?: boolean
}

export function Card({ className, interactive, soft, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card",
        soft ? "bg-surface" : "bg-white shadow-card",
        interactive &&
          "transition-[box-shadow,transform] duration-base ease-out-strong hover:shadow-card-hover hover:-translate-y-px cursor-pointer",
        className
      )}
      {...props}
    />
  )
}
