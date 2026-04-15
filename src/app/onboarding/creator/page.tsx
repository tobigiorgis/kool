"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface CreatorInfo {
  id: string
  name: string
  email: string
  instagram: string | null
  tiktok: string | null
  niche: string | null
  audienceSize: number | null
  discountCode: string | null
  commissionPct: number
  status: string
  workspace: { name: string }
}

const NICHES = [
  "Moda y estilo",
  "Belleza y skincare",
  "Fitness y deporte",
  "Gastronomía",
  "Tecnología",
  "Lifestyle",
  "Viajes",
  "Gaming",
  "Educación",
  "Otro",
]

function CreatorOnboardingForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [creator, setCreator] = useState<CreatorInfo | null>(null)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    phone: "",
    instagram: "",
    tiktok: "",
    niche: "",
    audienceSize: "",
    address: "",
    city: "",
    province: "",
    zipCode: "",
  })

  useEffect(() => {
    if (!token) {
      setLoadError("Link inválido.")
      setLoading(false)
      return
    }

    fetch(`/api/onboarding/creator?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLoadError(d.error); return }
        setCreator(d.creator)
        setForm((f) => ({
          ...f,
          name: d.creator.name ?? "",
          instagram: d.creator.instagram ?? "",
          tiktok: d.creator.tiktok ?? "",
          niche: d.creator.niche ?? "",
          audienceSize: d.creator.audienceSize?.toString() ?? "",
        }))
      })
      .catch(() => setLoadError("Error al cargar el perfil."))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/onboarding/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form, audienceSize: form.audienceSize ? parseInt(form.audienceSize) : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return }
      setDone(true)
    } catch {
      setError("Error de conexión.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-base font-semibold text-gray-900 mb-1">Link inválido</h2>
          <p className="text-[13px] text-gray-400">{loadError}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={22} className="text-brand-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">¡Perfil activado!</h2>
          <p className="text-[13px] text-gray-400 mb-2">Tu código de descuento es:</p>
          {creator?.discountCode && (
            <div className="inline-block font-mono text-xl font-bold text-gray-900 bg-[#f5f5f5] px-4 py-2 rounded-lg mb-4">
              {creator.discountCode}
            </div>
          )}
          <p className="text-[13px] text-gray-400 mb-6">
            Ganás <strong>{creator?.commissionPct}%</strong> de comisión por cada venta que generes con tu código.
          </p>
          <button
            onClick={() => router.push("/creator")}
            className="bg-gray-900 text-white text-[13px] font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Ver mi panel →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-[#f0f0f0]">
        <div className="max-w-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[17px] font-semibold tracking-tight text-gray-900">kool</span>
            <span className="w-[5px] h-[5px] rounded-full bg-brand-400 mb-0.5 ml-0.5" />
          </div>
          {creator && (
            <span className="text-[12px] text-gray-400">
              Invitado por <strong className="text-gray-700">{creator.workspace.name}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Completá tu perfil</h1>
          <p className="text-[13px] text-gray-400">
            Esta información la usa la marca para enviarte productos y calcular tus comisiones.
          </p>
        </div>

        {creator?.discountCode && (
          <div className="mb-8 p-4 border border-[#f0f0f0] rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Tu código de descuento</p>
              <p className="text-xl font-bold font-mono text-gray-900">{creator.discountCode}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400">Comisión</p>
              <p className="text-lg font-semibold text-brand-400">{creator.commissionPct}%</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-3">Información personal</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Nombre completo *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Teléfono</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+54 11 1234-5678" className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-3">Redes sociales</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Instagram</label>
                  <div className="flex">
                    <span className="px-2.5 py-2 bg-[#f5f5f5] border border-r-0 border-[#e8e8e8] rounded-l-lg text-[12px] text-gray-400">@</span>
                    <input type="text" value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="tuusuario" className="flex-1 px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-r-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">TikTok</label>
                  <div className="flex">
                    <span className="px-2.5 py-2 bg-[#f5f5f5] border border-r-0 border-[#e8e8e8] rounded-l-lg text-[12px] text-gray-400">@</span>
                    <input type="text" value={form.tiktok} onChange={(e) => setForm((f) => ({ ...f, tiktok: e.target.value }))} placeholder="tuusuario" className="flex-1 px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-r-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Nicho</label>
                  <select value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))} className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white">
                    <option value="">Seleccioná...</option>
                    {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Seguidores aprox.</label>
                  <input type="number" value={form.audienceSize} onChange={(e) => setForm((f) => ({ ...f, audienceSize: e.target.value }))} placeholder="15000" className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">Dirección de envío</h2>
            <p className="text-[11px] text-gray-400 mb-3">Para recibir productos de gifting.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Calle y número</label>
                <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Av. Corrientes 1234, Piso 3 Dto A" className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Ciudad</label>
                  <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Buenos Aires" className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Provincia</label>
                  <input type="text" value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} placeholder="CABA" className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Código postal</label>
                  <input type="text" value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} placeholder="1043" className="w-full px-3 py-2 text-[13px] border border-[#e8e8e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300" />
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-[12px] text-red-600">{error}</p>
            </div>
          )}

          <button type="submit" disabled={submitting || !form.name} className="w-full py-2.5 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {submitting ? "Guardando..." : "Activar mi perfil →"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CreatorOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    }>
      <CreatorOnboardingForm />
    </Suspense>
  )
}
