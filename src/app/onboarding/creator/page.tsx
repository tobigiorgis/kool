"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, AlertCircle, Loader2, ChevronRight } from "lucide-react"
import { NicheSelector } from "@/components/creator/NicheSelector"
import { creatorUrl } from "@/lib/host"

interface CreatorInfo {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  email: string
  instagram: string | null
  tiktok: string | null
  discountCode: string | null
  commissionPct: number
  status: string
  workspace: { name: string; brandLogo: string | null }
}

function CreatorOnboardingForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [creator, setCreator] = useState<CreatorInfo | null>(null)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    phone: "",
    instagram: "",
    tiktok: "",
    dateOfBirth: "",
    city: "",
    province: "",
    niches: [] as string[],
    shippingAddress: "",
    shippingCity: "",
    shippingProvince: "",
    shippingZipCode: "",
    bankAlias: "",
    acceptTerms: false,
  })

  useEffect(() => {
    if (!token) {
      // No token: check if they arrived via register (already authed), skip load
      setLoading(false)
      return
    }

    fetch(`/api/onboarding/creator?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setLoadError(d.error)
          return
        }
        setCreator(d.creator)
        setForm((f) => ({
          ...f,
          instagram: d.creator.instagram ?? "",
          tiktok: d.creator.tiktok ?? "",
        }))
      })
      .catch(() => setLoadError("Error al cargar el perfil."))
      .finally(() => setLoading(false))
  }, [token])

  const goToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.acceptTerms) {
      setError("Debés aceptar los términos para continuar.")
      return
    }
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/onboarding/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token ?? undefined, ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al guardar")
        return
      }
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
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={26} className="text-brand-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Perfil activado!</h2>
          {creator?.discountCode && (
            <>
              <p className="text-[13px] text-gray-400 mb-3">Tu código de descuento es:</p>
              <div className="inline-block font-mono text-2xl font-bold text-gray-900 bg-gray-50 px-5 py-2.5 rounded-xl mb-4 border border-gray-100">
                {creator.discountCode}
              </div>
              <p className="text-[13px] text-gray-500 mb-6">
                Ganás <strong className="text-gray-900">{creator.commissionPct}%</strong> de
                comisión por cada venta que generes.
              </p>
            </>
          )}
          <button
            onClick={() => {
              window.location.href = creatorUrl("")
            }}
            className="bg-gray-900 text-white text-[13px] font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Ver mi panel →
          </button>
        </div>
      </div>
    )
  }

  const inputCls =
    "w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-300 focus:border-brand-300"
  const labelCls = "block text-[12px] font-medium text-gray-700 mb-1.5"

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <div className="border-b border-gray-100">
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
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className={`flex items-center gap-2 ${step >= 1 ? "text-gray-900" : "text-gray-300"}`}
          >
            <div
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step >= 1 ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"}`}
            >
              1
            </div>
            <span className="text-[13px] font-medium">Tu perfil</span>
          </div>
          <ChevronRight size={14} className="text-gray-300" />
          <div
            className={`flex items-center gap-2 ${step >= 2 ? "text-gray-900" : "text-gray-300"}`}
          >
            <div
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step >= 2 ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"}`}
            >
              2
            </div>
            <span className="text-[13px] font-medium">Envíos y cobros</span>
          </div>
        </div>

        {/* Discount code banner */}
        {creator?.discountCode && (
          <div className="mb-8 p-4 border border-gray-100 rounded-xl flex items-center justify-between bg-gray-50">
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                Tu código
              </p>
              <p className="text-xl font-bold font-mono text-gray-900">{creator.discountCode}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400">Comisión</p>
              <p className="text-lg font-semibold text-brand-500">{creator.commissionPct}%</p>
            </div>
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <form onSubmit={goToStep2} className="space-y-7">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Completá tu perfil</h1>
              <p className="text-[13px] text-gray-400">
                Contanos un poco sobre vos para que las marcas puedan conocerte.
              </p>
            </div>

            {/* Social */}
            <section className="space-y-3">
              <h2 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                Redes sociales
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Instagram</label>
                  <div className="flex">
                    <span className="px-2.5 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-[12px] text-gray-400">
                      @
                    </span>
                    <input
                      type="text"
                      value={form.instagram}
                      onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                      placeholder="tuusuario"
                      className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-r-lg focus:outline-none focus:ring-1 focus:ring-brand-300"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>TikTok</label>
                  <div className="flex">
                    <span className="px-2.5 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-[12px] text-gray-400">
                      @
                    </span>
                    <input
                      type="text"
                      value={form.tiktok}
                      onChange={(e) => setForm((f) => ({ ...f, tiktok: e.target.value }))}
                      placeholder="tuusuario"
                      className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-r-lg focus:outline-none focus:ring-1 focus:ring-brand-300"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+54 11 1234-5678"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Buenos Aires"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Provincia</label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                    placeholder="CABA"
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* Niches */}
            <section className="space-y-3">
              <div>
                <h2 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                  Tus nichos
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Elegí hasta 3 categorías que representan tu contenido
                </p>
              </div>
              <NicheSelector
                selected={form.niches}
                onChange={(niches) => setForm((f) => ({ ...f, niches }))}
              />
            </section>

            <button
              type="submit"
              className="w-full py-2.5 text-[13px] font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              Continuar →
            </button>
          </form>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Envíos y cobros</h1>
              <p className="text-[13px] text-gray-400">
                Para recibir productos y cobrar tus comisiones.
              </p>
            </div>

            {/* Shipping */}
            <section className="space-y-3">
              <h2 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                Dirección de envío
              </h2>
              <div>
                <label className={labelCls}>Calle y número</label>
                <input
                  type="text"
                  value={form.shippingAddress}
                  onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                  placeholder="Av. Corrientes 1234, Piso 3 Dto A"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input
                    type="text"
                    value={form.shippingCity}
                    onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
                    placeholder="Buenos Aires"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Provincia</label>
                  <input
                    type="text"
                    value={form.shippingProvince}
                    onChange={(e) => setForm((f) => ({ ...f, shippingProvince: e.target.value }))}
                    placeholder="CABA"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Código postal</label>
                  <input
                    type="text"
                    value={form.shippingZipCode}
                    onChange={(e) => setForm((f) => ({ ...f, shippingZipCode: e.target.value }))}
                    placeholder="1043"
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="space-y-3">
              <h2 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                Datos de cobro
              </h2>
              <div>
                <label className={labelCls}>Alias o CBU (para transferencias)</label>
                <input
                  type="text"
                  value={form.bankAlias}
                  onChange={(e) => setForm((f) => ({ ...f, bankAlias: e.target.value }))}
                  placeholder="mi.alias.banco"
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Lo usa la marca para transferirte tus comisiones.
                </p>
              </div>
            </section>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-brand-500"
              />
              <span className="text-[13px] text-gray-600">
                Acepto los{" "}
                <a
                  href="/terms"
                  target="_blank"
                  className="text-brand-600 underline hover:text-brand-700"
                >
                  términos y condiciones
                </a>{" "}
                del programa de creators de Kool
              </span>
            </label>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-[12px] text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ← Atrás
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 text-[13px] font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Activando..." : "Activar mi perfil →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CreatorOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      }
    >
      <CreatorOnboardingForm />
    </Suspense>
  )
}
