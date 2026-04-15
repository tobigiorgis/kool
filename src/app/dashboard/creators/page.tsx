"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Instagram, Mail, Gift, Link2, RefreshCw, Upload, X, CheckCircle, AlertCircle } from "lucide-react"
import { generateDiscountCode } from "@/lib/utils"

interface Creator {
  id: string
  name: string
  email: string
  instagram: string | null
  tier: string
  status: string
  discountCode: string | null
  commissionPct: number
  niche: string | null
  audienceSize: number | null
  _count: { conversions: number }
}

const TIER_STYLES: Record<string, string> = {
  GOLD: "bg-amber-100 text-amber-700",
  SILVER: "bg-gray-100 text-gray-600",
  BRONZE: "bg-orange-100 text-orange-700",
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  INACTIVE: "bg-gray-100 text-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
  INACTIVE: "Inactivo",
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await fetch("/api/workspace/me")
      if (!wsRes.ok) return
      const { workspace } = await wsRes.json()
      if (!workspace) return

      setWorkspaceId(workspace.id)
      const res = await fetch(`/api/creators?workspaceId=${workspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setCreators(data.creators)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const active = creators.filter((c) => c.status === "ACTIVE").length
  const totalConversions = creators.reduce((s, c) => s + (c._count?.conversions ?? 0), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Creators</h1>
          <p className="text-sm text-gray-500 mt-1">Gestioná tu programa de afiliados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-600 border border-[#e8e8e8] rounded-lg hover:bg-[#f5f5f5] transition-colors"
          >
            <Upload size={14} />
            Importar CSV
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} />
            Invitar creator
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Creators activos</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Conversiones totales</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : totalConversions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Total invitados</p>
          <p className="text-2xl font-semibold text-gray-900">{loading ? "—" : creators.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : creators.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">Todavía no invitaste ningún creator.</p>
            <button
              onClick={() => setShowInvite(true)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Invitar primer creator →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Creator</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Código</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Ventas</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {creators.map((creator) => (
                <tr key={creator.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold">
                        {creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{creator.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{creator.email}</span>
                          {creator.instagram && (
                            <a
                              href={`https://instagram.com/${creator.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-pink-500"
                            >
                              <Instagram size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_STYLES[creator.tier]}`}>
                      {creator.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[creator.status]}`}>
                      {STATUS_LABELS[creator.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {creator.discountCode ? (
                      <>
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {creator.discountCode}
                        </span>
                        <span className="text-xs text-gray-400 ml-1.5">{creator.commissionPct}%</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">
                    {creator._count?.conversions ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/dashboard/gifting?creatorId=${creator.id}`}
                        title="Enviar gifting"
                        className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg"
                      >
                        <Gift size={14} />
                      </a>
                      <a
                        href={`/dashboard/links?creatorId=${creator.id}`}
                        title="Ver links"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Link2 size={14} />
                      </a>
                      <a
                        href={`/dashboard/briefing?creatorId=${creator.id}`}
                        title="Enviar briefing"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Mail size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && workspaceId && (
        <InviteCreatorModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
          onCreated={loadData}
        />
      )}
      {showImport && workspaceId && (
        <ImportCSVModal
          workspaceId={workspaceId}
          onClose={() => setShowImport(false)}
          onCreated={loadData}
        />
      )}
    </div>
  )
}

function InviteCreatorModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: "", email: "", instagram: "",
    commissionPct: "10", discountCode: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleNameChange = (name: string) => {
    const code = generateDiscountCode(name, parseInt(form.commissionPct) || 10)
    setForm((f) => ({ ...f, name, discountCode: code }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: form.name,
          email: form.email,
          instagram: form.instagram || undefined,
          commissionPct: parseFloat(form.commissionPct),
          discountCode: form.discountCode || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al invitar creator")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Invitar creator</h2>
          <p className="text-xs text-gray-500 mt-0.5">Le llegará un email con su código de descuento.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Camila Ruiz"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="camila@email.com"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Instagram</label>
            <div className="flex">
              <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-400">@</span>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                placeholder="camilaruiz"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Comisión %</label>
              <input
                type="number"
                value={form.commissionPct}
                onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value }))}
                min="1" max="50"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Código de descuento</label>
              <input
                type="text"
                value={form.discountCode}
                onChange={(e) => setForm((f) => ({ ...f, discountCode: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Enviando..." : "Enviar invitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CSV Import Modal ──────────────────────────────────────────────────────────

interface CSVRow {
  email: string
  name: string
  instagram: string
  commissionPct: number
  valid: boolean
  error?: string
}

interface ImportResult {
  imported: number
  invited: number
  skipped: number
  errors: { email: string; reason: string }[]
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []

  // Detectar header comprobando si la primera celda parece un email real
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const firstCell = lines[0].split(",")[0].trim().replace(/^"|"$/g, "")
  const hasHeader = !emailRegex.test(firstCell)
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const email = cols[0] ?? ""
    const name = cols[1] || email.split("@")[0]
    const instagram = cols[2] ?? ""
    const commissionPct = parseFloat(cols[3]) || 10

    const valid = emailRegex.test(email)
    return {
      email,
      name,
      instagram,
      commissionPct,
      valid,
      error: !valid ? "Email inválido" : undefined,
    }
  })
}

function ImportCSVModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CSVRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRows(parseCSV(text))
    }
    reader.readAsText(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const validRows = rows.filter((r) => r.valid)

  const handleImport = async () => {
    if (!validRows.length) return
    setLoading(true)
    try {
      const res = await fetch("/api/creators/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          creators: validRows.map((r) => ({
            email: r.email,
            name: r.name,
            instagram: r.instagram || undefined,
            commissionPct: r.commissionPct,
          })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        onCreated()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0]">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Importar creators desde CSV</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Formato: <span className="font-mono">email, nombre, instagram, comision%</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-[#f5f5f5] rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Resultado final */}
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-brand-400">
                <CheckCircle size={18} />
                <span className="text-[14px] font-medium text-gray-900">Importación completada</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-[#f0f0f0] rounded-xl p-4 text-center">
                  <p className="text-2xl font-semibold text-gray-900">{result.imported}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Activados directo</p>
                </div>
                <div className="border border-[#f0f0f0] rounded-xl p-4 text-center">
                  <p className="text-2xl font-semibold text-gray-900">{result.invited}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Invitaciones enviadas</p>
                </div>
                <div className="border border-[#f0f0f0] rounded-xl p-4 text-center">
                  <p className="text-2xl font-semibold text-gray-900">{result.skipped}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Ya existían</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-[12px] font-medium text-red-700 mb-1">Errores:</p>
                  {result.errors.map((e) => (
                    <p key={e.email} className="text-[11px] text-red-600">{e.email}: {e.reason}</p>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>
          ) : rows.length === 0 ? (
            /* Upload area */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver ? "border-brand-400 bg-brand-50" : "border-[#e8e8e8] hover:border-gray-300"
              }`}
            >
              <Upload size={24} className="mx-auto text-gray-300 mb-3" />
              <p className="text-[13px] font-medium text-gray-600">Arrastrá tu CSV o hacé click para subir</p>
              <p className="text-[11px] text-gray-400 mt-1">Una fila por creator. El header es opcional.</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              {/* Ejemplo */}
              <div className="mt-5 p-3 bg-[#f8f8f8] rounded-lg text-left inline-block">
                <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
                  camila@mail.com<br />
                  marti@mail.com,Martina López,martinaok,15<br />
                  sofi@mail.com,Sofi García
                </p>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Solo el email es obligatorio. Nombre, Instagram y comisión son opcionales.</p>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-gray-600">
                  <strong className="text-gray-900">{validRows.length}</strong> válidos
                  {rows.length - validRows.length > 0 && (
                    <span className="text-red-500 ml-2">· {rows.length - validRows.length} con error</span>
                  )}
                </p>
                <button
                  onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = "" }}
                  className="text-[12px] text-gray-400 hover:text-gray-600"
                >
                  Cambiar archivo
                </button>
              </div>

              <div className="border border-[#f0f0f0] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8f8f8] border-b border-[#f0f0f0]">
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400">Email</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400">Nombre</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400">Instagram</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-medium text-gray-400">Comisión</th>
                      <th className="px-4 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {rows.map((row, i) => (
                      <tr key={i} className={row.valid ? "" : "bg-red-50"}>
                        <td className="px-4 py-2.5 text-[12px] text-gray-700">{row.email}</td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-700">{row.name}</td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-500">
                          {row.instagram ? `@${row.instagram}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-700 text-right">{row.commissionPct}%</td>
                        <td className="px-4 py-2.5 text-center">
                          {row.valid
                            ? <CheckCircle size={13} className="text-brand-400 mx-auto" />
                            : <AlertCircle size={13} className="text-red-400 mx-auto" title={row.error} />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botón de importar */}
        {!result && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-[#f0f0f0] flex items-center justify-between">
            <p className="text-[12px] text-gray-400">
              Los que ya tienen cuenta en Kool se activan directo. El resto recibe un email de invitación.
            </p>
            <button
              onClick={handleImport}
              disabled={loading || validRows.length === 0}
              className="ml-4 flex-shrink-0 px-5 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Importando..." : `Importar ${validRows.length} creators`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
