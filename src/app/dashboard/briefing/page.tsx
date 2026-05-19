"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Send, FileText, Users, RefreshCw, Paperclip, X, Upload, Pencil } from "lucide-react"

interface Creator {
  id: string
  name: string
  email: string
}

interface BriefingAsset {
  name: string
  url: string
  type: string
}

interface Briefing {
  id: string
  subject: string
  body: string
  campaignName: string | null
  startDate: string | null
  endDate: string | null
  status: string
  sentAt: string | null
  createdAt: string
  assets: BriefingAsset[] | null
  recipients: { creator: Creator }[]
}

export default function BriefingPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingBriefing, setEditingBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await fetch("/api/workspace/me")
      if (!wsRes.ok) return
      const { workspace } = await wsRes.json()
      if (!workspace) return

      setWorkspaceId(workspace.id)
      const res = await fetch(`/api/briefing?workspaceId=${workspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setBriefings(data.briefings)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Briefing</h1>
          <p className="text-sm text-gray-500 mt-1">Enviá instrucciones de campaña a tus creators</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500"
        >
          <Plus size={16} />
          Nuevo briefing
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw size={20} className="animate-spin text-gray-400" />
        </div>
      ) : briefings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">Todavía no creaste ningún briefing.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Crear primer briefing →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {briefings.map((briefing) => {
            const assets = briefing.assets ?? []
            return (
              <div
                key={briefing.id}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
                      <FileText size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{briefing.subject}</p>
                      {briefing.campaignName && (
                        <p className="text-xs text-gray-400 mt-0.5">{briefing.campaignName}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {briefing.status === "SENT" ? (
                          <>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users size={11} />
                              {briefing.recipients.length} enviados
                            </span>
                            {briefing.sentAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(briefing.sentAt).toLocaleDateString("es-AR")}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                            Borrador
                          </span>
                        )}
                        {assets.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Paperclip size={11} />
                            {assets.length} archivo{assets.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {assets.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {assets.map((a, i) => (
                            <a
                              key={i}
                              href={`/api/files?url=${encodeURIComponent(a.url)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Paperclip size={10} />
                              {a.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingBriefing(briefing)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar briefing"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && workspaceId && (
        <BriefingModal
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onSaved={loadData}
        />
      )}

      {editingBriefing && workspaceId && (
        <BriefingModal
          workspaceId={workspaceId}
          briefing={editingBriefing}
          onClose={() => setEditingBriefing(null)}
          onSaved={() => { loadData(); setEditingBriefing(null) }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Componente compartido: crear o editar
// ─────────────────────────────────────────────

function BriefingModal({
  workspaceId,
  briefing,
  onClose,
  onSaved,
}: {
  workspaceId: string   // workspaceId para create, briefing.id para edit (no se usa en edit)
  briefing?: Briefing
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!briefing

  const [form, setForm] = useState({
    subject: briefing?.subject ?? "",
    campaignName: briefing?.campaignName ?? "",
    startDate: briefing?.startDate ? briefing.startDate.slice(0, 10) : "",
    endDate: briefing?.endDate ? briefing.endDate.slice(0, 10) : "",
    body: briefing?.body ?? "",
  })
  const [assets, setAssets] = useState<BriefingAsset[]>(briefing?.assets ?? [])
  const [uploading, setUploading] = useState(false)
  const [creators, setCreators] = useState<Creator[]>([])
  const [selectedCreators, setSelectedCreators] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEdit && workspaceId) {
      fetch(`/api/creators?workspaceId=${workspaceId}`)
        .then((r) => r.json())
        .then((d) => setCreators(d.creators ?? []))
        .catch(() => {})
    }
  }, [workspaceId, isEdit])

  const toggleCreator = (id: string) =>
    setSelectedCreators((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const text = await res.text()
      let data: Record<string, string>
      try { data = JSON.parse(text) } catch { setError("Respuesta inválida: " + text.slice(0, 200)); return }
      if (!res.ok) {
        setError(data.error ?? "Error al subir el archivo")
        return
      }
      setAssets((prev) => [...prev, { name: data.name, url: data.url, type: data.type }])
    } catch (err) {
      setError("Error de conexión al subir el archivo: " + String(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeAsset = (index: number) =>
    setAssets((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.MouseEvent, send: boolean) => {
    e.preventDefault()
    if (!form.subject || !form.body) return
    setLoading(true)
    setError("")

    try {
      if (isEdit) {
        const res = await fetch(`/api/briefing/${briefing!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: form.subject,
            body: form.body,
            campaignName: form.campaignName || undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            assets,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Error al guardar"); return }
      } else {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            subject: form.subject,
            campaignName: form.campaignName || undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            body: form.body,
            assets,
            creatorIds: send ? selectedCreators : [],
            send,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Error al crear el briefing"); return }
      }
      onSaved()
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Editar briefing" : "Nuevo briefing"}
          </h2>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre de campaña</label>
              <input
                type="text"
                value={form.campaignName}
                onChange={(e) => setForm((f) => ({ ...f, campaignName: e.target.value }))}
                placeholder="Invierno 2026"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Asunto del email *</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief: Campaña Invierno 2026"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Contenido del brief *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Describí los objetivos, entregables, fechas clave, hashtags..."
              rows={6}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          {/* Archivos adjuntos */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Archivos adjuntos</label>
            {assets.length > 0 && (
              <div className="space-y-2 mb-2">
                {assets.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip size={13} className="text-gray-400 shrink-0" />
                      <a
                        href={`/api/files?url=${encodeURIComponent(a.url)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate"
                      >
                        {a.name}
                      </a>
                    </div>
                    <button
                      onClick={() => removeAsset(i)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 text-xs text-gray-600 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 w-full justify-center"
            >
              {uploading ? (
                <><RefreshCw size={12} className="animate-spin" /> Subiendo...</>
              ) : (
                <><Upload size={12} /> Subir PDF o Word</>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX — máx. 10MB</p>
          </div>

          {/* Destinatarios (solo en creación) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Destinatarios</label>
              {creators.length === 0 ? (
                <p className="text-xs text-gray-400">No hay creators disponibles todavía.</p>
              ) : (
                <div className="space-y-2">
                  {creators.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCreators.includes(c.id)
                          ? "border-brand-400 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCreators.includes(c.id)}
                        onChange={() => toggleCreator(c.id)}
                        className="rounded text-brand-400"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          {isEdit ? (
            <button
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading || !form.subject || !form.body}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          ) : (
            <>
              <button
                onClick={(e) => handleSubmit(e, false)}
                disabled={loading || !form.subject || !form.body}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Guardar borrador
              </button>
              <button
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading || selectedCreators.length === 0 || !form.subject || !form.body}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
              >
                <Send size={14} />
                {loading
                  ? "Enviando..."
                  : `Enviar a ${selectedCreators.length} creator${selectedCreators.length !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
