"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

type Role = "BRAND" | "CREATOR" | "ADMIN"

const ROLE_STYLE: Record<Role, string> = {
  BRAND: "bg-gray-50 text-gray-600 border-gray-200",
  CREATOR: "bg-pink-50 text-pink-700 border-pink-200",
  ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
}

export function RoleSelector({ userId, role }: { userId: string; role: Role }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = async (next: Role) => {
    if (next === role) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Error al cambiar rol")
        return
      }
      router.refresh()
    } catch {
      setError("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value as Role)}
        className={`text-[11px] font-medium px-2 py-1 rounded-full border focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-50 ${ROLE_STYLE[role]}`}
      >
        <option value="BRAND">BRAND</option>
        <option value="CREATOR">CREATOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      {loading && <Loader2 size={12} className="animate-spin text-gray-400" />}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  )
}
