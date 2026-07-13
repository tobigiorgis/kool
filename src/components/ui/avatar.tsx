import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps {
  name: string
  src?: string | null
  size?: number
  className?: string
}

/** Avatar con fallback de iniciales sobre fill rosa. */
export function Avatar({ name, src, size = 28, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover shrink-0", className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={cn(
        "rounded-full bg-pink-fill text-pink-deep font-medium flex items-center justify-center shrink-0",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials}
    </span>
  )
}
