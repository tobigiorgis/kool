"use client"

import { useState } from "react"
import { Plus, Send, FileText, Users, Eye } from "lucide-react"

const MOCK_BRIEFINGS = [
  {
    id: "1",
    subject: "Campaña Invierno 2026 — Colección Premium",
    campaignName: "Invierno 2026",
    status: "SENT",
    sentAt: "2026-04-05",
    recipients: 3,
    opens: 2,
  },
  {
    id: "2",
    subject: "Brief: Lanzamiento Nueva Línea Running",
    campaignName: "Running Launch",
    status: "SENT",
    sentAt: "2026-03-20",
    recipients: 2,
    opens: 2,
  },
  {
    id: "3",
    subject: "Campaña Día de la Madre — Mayo 2026",
    campaignName: "Día de la Madre",
    status: "DRAFT",
    sentAt: null,
    recipients: 0,
    opens: 0,
  },
]

export default function BriefingPage() {
  const [showCreate, setShowCreate] = useState(false)

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

      <div className="space-y-3">
        {MOCK_BRIEFINGS.map((briefing) => (
          <div key={briefing.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
                  <FileText size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{briefing.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{briefing.campaignName}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {briefing.status === "SENT" ? (
                      <>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users size={11} />
                          {briefing.recipients} enviados
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Eye size={11} />
                          {briefing.opens} abiertos
                        </span>
                        <span className="text-xs text-gray-400">{briefing.sentAt}</span>
                      </>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        Borrador
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {briefing.status === "DRAFT" && (
                  <button className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100">
                    <Send size={12} />
                    Enviar
                  </button>
                )}
                <button className="text-xs text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Ver
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateBriefingModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateBriefingModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    subject: "",
    campaignName: "",
    startDate: "",
    endDate: "",
    body: "",
  })
  const [selectedCreators, setSelectedCreators] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const MOCK_CREATORS = [
    { id: "1", name: "Camila Ruiz", email: "camila@email.com" },
    { id: "2", name: "Martina López", email: "marti@email.com" },
    { id: "3", name: "Sofía Gómez", email: "sofi@email.com" },
  ]

  const toggleCreator = (id: string) => {
    setSelectedCreators((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent, send: boolean) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nuevo briefing</h2>
        </div>
        <form className="p-6 space-y-4">
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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Asunto del email</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief: Campaña Invierno 2026"
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Contenido del brief
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Describí los objetivos, entregables, fechas clave, hashtags y cualquier instrucción importante para el creator..."
              rows={6}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Destinatarios
            </label>
            <div className="space-y-2">
              {MOCK_CREATORS.map((c) => (
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
          </div>
        </form>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading || selectedCreators.length === 0 || !form.subject}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
          >
            <Send size={14} />
            {loading ? "Enviando..." : `Enviar a ${selectedCreators.length} creator${selectedCreators.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  )
}
