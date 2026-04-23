"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"

interface FieldConfig {
  enabled: boolean
  required: boolean
}

interface CampaignInfo {
  id: string
  name: string
  description: string | null
  brandLogo: string | null
  coverImage: string | null
  brandColor: string
  formStatus: string
  fields: {
    phone?:     FieldConfig
    age?:       FieldConfig
    city?:      FieldConfig
    instagram?: FieldConfig
    tiktok?:    FieldConfig
  } | null
  workspace: { name: string }
}

export default function ApplyPage() {
  const { slug } = useParams<{ slug: string }>()
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [closed, setClosed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [alreadyApplied, setAlreadyApplied] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    city: "",
    instagram: "",
    tiktok: "",
  })

  useEffect(() => {
    fetch(`/api/apply/${slug}/info`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return }
        if (res.status === 410) { setClosed(true); return }
        const data = await res.json()
        setCampaign(data.campaign)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/apply/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          age: form.age ? parseInt(form.age) : undefined,
          city: form.city || undefined,
          instagram: form.instagram || undefined,
          tiktok: form.tiktok || undefined,
        }),
      })
      const data = await res.json()

      if (res.status === 409) { setAlreadyApplied(true); return }
      if (!res.ok) { setError(data.error ?? "Ocurrió un error. Intentá de nuevo."); return }

      setSubmitted(true)
    } catch {
      setError("Error de conexión. Intentá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  const color = campaign?.brandColor ?? "#00C46A"
  const fields = campaign?.fields ?? {}

  const isEnabled = (key: keyof typeof fields) => fields[key]?.enabled !== false
  const isRequired = (key: keyof typeof fields) => !!fields[key]?.required

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-2xl font-semibold text-gray-900 mb-2">Campaña no encontrada</p>
          <p className="text-gray-500 text-sm">El link puede haber expirado o no existe.</p>
        </div>
      </div>
    )
  }

  if (closed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-xl font-semibold text-gray-900 mb-2">Aplicaciones cerradas</p>
          <p className="text-gray-500 text-sm">Esta campaña ya no está aceptando nuevas aplicaciones.</p>
        </div>
      </div>
    )
  }

  if (alreadyApplied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: color + "20" }}
          >
            <CheckCircle2 size={32} style={{ color }} />
          </div>
          <p className="text-xl font-semibold text-gray-900 mb-2">Ya aplicaste</p>
          <p className="text-gray-500 text-sm">Ya enviaste tu aplicación a esta campaña. Te contactaremos pronto.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: color + "20" }}
          >
            <CheckCircle2 size={32} style={{ color }} />
          </div>
          <p className="text-xl font-semibold text-gray-900 mb-2">¡Aplicación enviada!</p>
          <p className="text-gray-500 text-sm">
            Recibimos tu aplicación para <strong>{campaign?.name}</strong>. Revisá tu email — te confirmamos la recepción y te avisamos el resultado pronto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover image */}
      {campaign?.coverImage && (
        <div
          className="h-48 sm:h-64 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${campaign.coverImage})` }}
        />
      )}

      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          {campaign?.brandLogo && (
            <img
              src={campaign.brandLogo}
              alt={campaign.workspace.name}
              className="h-12 object-contain mx-auto mb-4"
            />
          )}
          {!campaign?.brandLogo && (
            <div className="text-sm font-medium text-gray-400 mb-3">{campaign?.workspace.name}</div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {campaign?.name}
          </h1>
          {campaign?.description && (
            <p className="text-gray-500 mt-3 text-[15px] leading-relaxed">
              {campaign.description}
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Completá tu información</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — always required */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Nombre completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Tu nombre"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ "--tw-ring-color": color } as React.CSSProperties}
              />
            </div>

            {/* Email — always required */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="tu@email.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": color } as React.CSSProperties}
              />
            </div>

            {/* Phone */}
            {isEnabled("phone") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Teléfono {isRequired("phone") && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required={isRequired("phone")}
                  placeholder="+54 11 1234-5678"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": color } as React.CSSProperties}
                />
              </div>
            )}

            {/* Age */}
            {isEnabled("age") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Edad {isRequired("age") && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  required={isRequired("age")}
                  min="13" max="99"
                  placeholder="25"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": color } as React.CSSProperties}
                />
              </div>
            )}

            {/* City */}
            {isEnabled("city") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Ciudad {isRequired("city") && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  required={isRequired("city")}
                  placeholder="Buenos Aires"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": color } as React.CSSProperties}
                />
              </div>
            )}

            {/* Instagram */}
            {isEnabled("instagram") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Instagram {isRequired("instagram") && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                  <input
                    type="text"
                    value={form.instagram}
                    onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value.replace("@", "") }))}
                    required={isRequired("instagram")}
                    placeholder="tuusuario"
                    className="w-full pl-7 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": color } as React.CSSProperties}
                  />
                </div>
              </div>
            )}

            {/* TikTok */}
            {isEnabled("tiktok") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  TikTok {isRequired("tiktok") && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                  <input
                    type="text"
                    value={form.tiktok}
                    onChange={(e) => setForm((f) => ({ ...f, tiktok: e.target.value.replace("@", "") }))}
                    required={isRequired("tiktok")}
                    placeholder="tuusuario"
                    className="w-full pl-7 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": color } as React.CSSProperties}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 text-[13px] px-3 py-2.5 rounded-xl">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-opacity disabled:opacity-60 mt-2"
              style={{ backgroundColor: color }}
            >
              {submitting ? "Enviando..." : "Aplicar →"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Powered by{" "}
          <span className="font-semibold text-gray-500">kool</span>
        </p>
      </div>
    </div>
  )
}
