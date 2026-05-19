"use client"

import { useState, useEffect } from "react"
import { User, MapPin, Share2, Save, Check } from "lucide-react"

const NICHES = [
  "Moda y estilo", "Belleza y skincare", "Fitness y deporte",
  "Gastronomía", "Tecnología", "Lifestyle", "Viajes", "Gaming",
  "Educación", "Otro",
]

interface CreatorProfile {
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  twitter: string | null
  niche: string | null
  audienceSize: number | null
  address: string | null
  city: string | null
  province: string | null
  country: string | null
  zipCode: string | null
}

export default function CreatorSettingsPage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [form, setForm] = useState<Partial<CreatorProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/creator/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.creator) {
          setProfile(d.creator)
          setForm(d.creator)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof CreatorProfile, value: string | number | null) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/creator/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Error al guardar")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 px-8 py-10">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 px-8 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mi perfil</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tus datos personales y de contacto
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50 transition-colors"
            style={{ backgroundColor: saved ? "#22c55e" : "#F8BBD0", color: saved ? "white" : "#374151" }}
          >
            {saved ? <><Check size={14} /> Guardado</> : <><Save size={14} /> {saving ? "Guardando..." : "Guardar cambios"}</>}
          </button>
        </div>

        <div className="space-y-5">
          {/* Datos personales */}
          <Section title="Datos personales" icon={<User size={15} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre completo *">
                <input
                  value={form.name ?? ""}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls}
                  placeholder="Tu nombre"
                />
              </Field>
              <Field label="Email">
                <input
                  value={form.email ?? ""}
                  disabled
                  className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                />
              </Field>
              <Field label="Teléfono">
                <input
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputCls}
                  placeholder="+54 9 11 ..."
                />
              </Field>
              <Field label="Nicho">
                <select
                  value={form.niche ?? ""}
                  onChange={(e) => set("niche", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccioná</option>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Audiencia estimada" className="col-span-2">
                <input
                  type="number"
                  value={form.audienceSize ?? ""}
                  onChange={(e) => set("audienceSize", e.target.value ? parseInt(e.target.value) : null)}
                  className={inputCls}
                  placeholder="50000"
                />
              </Field>
            </div>
          </Section>

          {/* Redes sociales */}
          <Section title="Redes sociales" icon={<Share2 size={15} />}>
            <div className="grid grid-cols-2 gap-4">
              {(["instagram", "tiktok", "youtube", "twitter"] as const).map((net) => (
                <Field key={net} label={net.charAt(0).toUpperCase() + net.slice(1)}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                    <input
                      value={form[net] ?? ""}
                      onChange={(e) => set(net, e.target.value.replace("@", ""))}
                      className={`${inputCls} pl-7`}
                      placeholder={`tu_usuario`}
                    />
                  </div>
                </Field>
              ))}
            </div>
          </Section>

          {/* Dirección */}
          <Section title="Dirección de envío" icon={<MapPin size={15} />}>
            <p className="text-xs text-gray-400 mb-4">
              Usada para envíos de gifting. No se comparte públicamente.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Dirección" className="col-span-2">
                <input
                  value={form.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                  className={inputCls}
                  placeholder="Av. Corrientes 1234, Piso 3"
                />
              </Field>
              <Field label="Ciudad">
                <input
                  value={form.city ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputCls}
                  placeholder="Buenos Aires"
                />
              </Field>
              <Field label="Provincia">
                <input
                  value={form.province ?? ""}
                  onChange={(e) => set("province", e.target.value)}
                  className={inputCls}
                  placeholder="CABA"
                />
              </Field>
              <Field label="Código postal">
                <input
                  value={form.zipCode ?? ""}
                  onChange={(e) => set("zipCode", e.target.value)}
                  className={inputCls}
                  placeholder="1043"
                />
              </Field>
              <Field label="País">
                <input
                  value={form.country ?? ""}
                  onChange={(e) => set("country", e.target.value)}
                  className={inputCls}
                  placeholder="AR"
                />
              </Field>
            </div>
          </Section>
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
        )}
      </div>
    </div>
  )
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F8BBD0]/50 bg-white"

function Section({
  title, icon, children,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F8BBD0" }}>
          <span className="text-gray-700">{icon}</span>
        </div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({
  label, children, className = "",
}: {
  label: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
