"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Silently accepts a pending collaboration invite on page load
export function CollaborationAcceptor({ token }: { token: string }) {
  const router = useRouter()

  useEffect(() => {
    fetch("/api/collaborations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then(() => {
        // Reload page without token param to show updated state
        router.replace("/dashboard/collaborations")
      })
      .catch(() => {
        router.replace("/dashboard/collaborations")
      })
  }, [token, router])

  return null
}
