"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Check, RefreshCw, Gift, DollarSign, Plus, X } from "lucide-react"

interface FieldState {
  enabled: boolean
  required: boolean
}

interface Question {
  id: string
  question: string
  type: "OPEN" | "SINGLE_CHOICE"
  required: boolean
  options: string[]
  newOption: string
}

interface Fields {
  phone: FieldState
  age: FieldState
  city: FieldState
  instagram: FieldState
  tiktok: FieldState
}

const DEFAULT_FIELDS: Fields = {
  phone: { enabled: true, required: false },
  age: { enabled: false, required: false },
  city: { enabled: true, required: false },
  instagram: { enabled: true, required: true },
  tiktok: { enabled: false, required: false },
}

const FIELD_LABELS: Record<keyof Fields, string> = {
  phone: "Teléfono",
  age: "Edad",
  city: "Ciudad",
  instagram: "Instagram",
  tiktok: "TikTok",
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50)
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kool-beta.vercel.app"

export default function NewCampaignPage() {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    slug: "",
    brandColor: "#FB7185",
  })
  const [fields, setFields] = useState<Fields>(DEFAULT_FIELDS)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [giftingEnabled, setGiftingEnabled] = useState(false)
  const [giftingDescription, setGiftingDescription] = useState("")
  const [commissionEnabled, setCommissionEnabled] = useState(false)
  const [commissionMaxPct, setCommissionMaxPct] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question: "",
        type: "OPEN",
        required: false,
        options: [],
        newOption: "",
      },
    ])
  }

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.newOption.trim()) return q
        return { ...q, options: [...q.options, q.newOption.trim()], newOption: "" }
      })
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q
        return { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
      })
    )
  }

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => setWorkspaceId(d.workspace?.id ?? null))
  }, [])

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && form.name) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }))
    }
  }, [form.name, slugManuallyEdited])

  const toggleField = (key: keyof Fields, prop: "enabled" | "required") => {
    setFields((prev) => {
      const current = prev[key]
      if (prop === "enabled") {
        return {
          ...prev,
          [key]: {
            enabled: !current.enabled,
            required: !current.enabled ? current.required : false,
          },
        }
      }
      // Can only set required if enabled
      if (!current.enabled) return prev
      return { ...prev, [key]: { ...current, required: !current.required } }
    })
  }

  const publicUrl = `${BASE_URL}/apply/${form.slug || "tu-slug"}`

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: form.name,
          description: form.description || undefined,
          slug: form.slug || undefined,
          fields,
          brandColor: form.brandColor,
          formStatus: "ACTIVE",
          giftingEnabled,
          giftingDescription: giftingEnabled ? giftingDescription : null,
          commissionEnabled,
          commissionMaxPct:
            commissionEnabled && commissionMaxPct ? parseFloat(commissionMaxPct) : null,
          questions: questions
            .filter((q) => q.question.trim())
            .map((q, i) => ({
              question: q.question,
              type: q.type,
              required: q.required,
              options: q.type === "SINGLE_CHOICE" ? q.options : [],
              order: i,
            })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear la campaña")
        return
      }
      router.push(`/dashboard/campaigns/${data.campaign.id}`)
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl">
      <button
        onClick={() => router.push("/dashboard/campaigns")}
        className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Campañas
      </button>

      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Nueva campaña</h1>
      <p className="text-sm text-gray-500 mb-8">
        Configurá el formulario público para que creators apliquen.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sección 1: Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Información de la campaña</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Ej: Lanzamiento verano 2026"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Contale a los creators de qué se trata esta campaña..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Slug de la URL pública *
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true)
                setForm((f) => ({
                  ...f,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                }))
              }}
              required
              pattern="[a-z0-9-]+"
              placeholder="lanzamiento-verano-2026"
              className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-gray-400">
                URL pública:{" "}
                <span className="text-gray-600 font-medium">
                  {BASE_URL}/apply/{form.slug || "tu-slug"}
                </span>
              </p>
              <button
                type="button"
                onClick={copyUrl}
                disabled={!form.slug}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Color de la marca
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brandColor}
                onChange={(e) => setForm((f) => ({ ...f, brandColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.brandColor}
                onChange={(e) => setForm((f) => ({ ...f, brandColor: e.target.value }))}
                className="w-28 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Campos del formulario */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Campos del formulario</h2>
          <p className="text-xs text-gray-500 mb-4">Nombre y Email siempre son requeridos.</p>

          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Campo</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">
                    Habilitar
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">
                    Obligatorio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Fixed fields */}
                {[
                  { label: "Nombre completo", fixed: true },
                  { label: "Email", fixed: true },
                ].map((f) => (
                  <tr key={f.label} className="bg-gray-50/50">
                    <td className="px-4 py-3 text-[13px] text-gray-400">{f.label}</td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch checked disabled />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch checked disabled />
                    </td>
                  </tr>
                ))}

                {/* Configurable fields */}
                {(Object.keys(FIELD_LABELS) as (keyof Fields)[]).map((key) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-[13px] text-gray-700">{FIELD_LABELS[key]}</td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch
                        checked={fields[key].enabled}
                        onChange={() => toggleField(key, "enabled")}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch
                        checked={fields[key].required}
                        disabled={!fields[key].enabled}
                        onChange={() => toggleField(key, "required")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección 3: Qué va a recibir el creator */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Qué va a recibir el creator</h2>
          <p className="text-xs text-gray-500 mb-4">
            Esto aparece en la landing de aplicación para atraer creators.
          </p>

          <div className="space-y-3">
            {/* Gifting */}
            <div
              className={`border rounded-xl p-4 transition-colors ${
                giftingEnabled ? "border-brand-300 bg-brand-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift size={15} className={giftingEnabled ? "text-brand-500" : "text-gray-400"} />
                  <span className="text-sm font-medium text-gray-900">Gifting</span>
                </div>
                <ToggleSwitch
                  checked={giftingEnabled}
                  onChange={() => setGiftingEnabled((v) => !v)}
                />
              </div>
              {giftingEnabled && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Descripción del gifting
                  </label>
                  <textarea
                    value={giftingDescription}
                    onChange={(e) => setGiftingDescription(e.target.value)}
                    placeholder="Ej: Recibirás una selección de productos de nuestra nueva colección para que los pruebes y compartas con tu comunidad."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Comisión */}
            <div
              className={`border rounded-xl p-4 transition-colors ${
                commissionEnabled ? "border-brand-300 bg-brand-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign
                    size={15}
                    className={commissionEnabled ? "text-brand-500" : "text-gray-400"}
                  />
                  <span className="text-sm font-medium text-gray-900">Comisión</span>
                </div>
                <ToggleSwitch
                  checked={commissionEnabled}
                  onChange={() => setCommissionEnabled((v) => !v)}
                />
              </div>
              {commissionEnabled && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Comisión máxima
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Hasta</span>
                    <input
                      type="number"
                      value={commissionMaxPct}
                      onChange={(e) => setCommissionMaxPct(e.target.value)}
                      min="1"
                      max="100"
                      placeholder="15"
                      className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 text-center"
                    />
                    <span className="text-sm text-gray-500">% por venta</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    El creator verá &quot;Hasta {commissionMaxPct || "X"}% por venta&quot; en la
                    landing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección 4: Preguntas para los aplicantes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Preguntas para los aplicantes</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Los creators responden estas preguntas al aplicar a la campaña.
              </p>
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700"
            >
              <Plus size={14} />
              Agregar pregunta
            </button>
          </div>

          {questions.length === 0 ? (
            <button
              type="button"
              onClick={addQuestion}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-center hover:border-brand-300 hover:bg-brand-50 transition-colors group"
            >
              <Plus size={18} className="text-gray-300 group-hover:text-brand-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 group-hover:text-brand-500">
                Agregar primera pregunta
              </p>
            </button>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Pregunta {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                    placeholder="Ej: ¿Qué tipo de pelo tenés?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => updateQuestion(q.id, { type: "OPEN", options: [] })}
                        className={`px-3 py-1 rounded transition-colors ${
                          q.type === "OPEN"
                            ? "bg-white shadow-sm text-gray-900 font-medium"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Respuesta abierta
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuestion(q.id, { type: "SINGLE_CHOICE" })}
                        className={`px-3 py-1 rounded transition-colors ${
                          q.type === "SINGLE_CHOICE"
                            ? "bg-white shadow-sm text-gray-900 font-medium"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Opciones
                      </button>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                        className="rounded text-brand-400"
                      />
                      <span className="text-xs text-gray-600">Obligatoria</span>
                    </label>
                  </div>

                  {q.type === "SINGLE_CHOICE" && (
                    <div className="space-y-2 pt-1">
                      {q.options.map((option, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-700 flex-1">{option}</span>
                          <button
                            type="button"
                            onClick={() => removeOption(q.id, i)}
                            className="text-gray-300 hover:text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                        <input
                          type="text"
                          value={q.newOption}
                          onChange={(e) => updateQuestion(q.id, { newOption: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addOption(q.id)
                            }
                          }}
                          placeholder="Agregar opción..."
                          className="flex-1 text-sm text-gray-600 placeholder-gray-300 border-none outline-none bg-transparent"
                        />
                        {q.newOption.trim() && (
                          <button
                            type="button"
                            onClick={() => addOption(q.id)}
                            className="text-xs text-brand-600 font-medium hover:text-brand-700"
                          >
                            Agregar
                          </button>
                        )}
                      </div>
                      {q.options.length === 0 && (
                        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg mt-1">
                          Agregá al menos una opción para esta pregunta.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addQuestion}
                className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
              >
                + Agregar otra pregunta
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/campaigns")}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !form.name || !form.slug || !workspaceId}
            className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw size={13} className="animate-spin" />}
            {loading ? "Creando..." : "Crear campaña y obtener link →"}
          </button>
        </div>
      </form>
    </div>
  )
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-brand-400" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}
