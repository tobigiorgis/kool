"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { slugify } from "@/lib/utils"

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(slugify(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al crear el workspace")
        return
      }

      router.push("/dashboard")
    } catch {
      setError("Error de conexión. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-gray-900">kool</span>
            <span className="w-2 h-2 rounded-full bg-brand-400 mb-0.5" />
          </div>
          <p className="text-gray-500 text-sm mt-2">¡Bienvenido! Configurá tu workspace para empezar.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Creá tu workspace</h1>
          <p className="text-sm text-gray-500 mb-6">
            Acá vas a gestionar tus links, creators y campañas.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Nombre de tu marca o agencia
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Agencia Bloom, Nike Argentina"
                required
                autoFocus
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Slug del workspace
              </label>
              <div className="flex">
                <span className="px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-400 flex-shrink-0">
                  app.kool.link/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="mi-workspace"
                  required
                  className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent min-w-0"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="w-full py-2.5 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creando workspace..." : "Crear workspace →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Podés cambiar el nombre después en Configuración.
        </p>
      </div>
    </div>
  )
}
