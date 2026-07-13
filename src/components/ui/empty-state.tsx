import { type ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

/** Un espacio vacío es una invitación a actuar, no una disculpa. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-up">
      <span className="kool-dot mb-4 opacity-60" style={{ width: 8, height: 8 }} />
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description && (
        <p className="text-[12.5px] text-ink-secondary mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
