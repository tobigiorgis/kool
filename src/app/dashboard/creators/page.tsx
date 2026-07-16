"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Search,
  Filter,
  ChevronDown,
  Plus,
  X,
  RefreshCw,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CreatorDetail } from "@/components/creator/CreatorDetail"

interface Creator {
  id: string
  name: string
  email: string
  phone?: string | null
  avatar?: string | null
  instagram?: string | null
  instagramFollowers?: number | null
  tiktok?: string | null
  tiktokFollowers?: number | null
  city?: string | null
  country?: string | null
  niche?: string | null
  discountCode?: string | null
  commissionPct: number
  tier: string
  status: string
  createdAt: string
  totalClicks: number
  totalSales: number
  totalRevenue: number
  totalCommissions: number
  pendingCommissions: number
  approvedCommissions: number
  paidCommissions: number
  links: { id: string; slug: string; destination: string; sales: number; revenue: number }[]
  commissions: {
    id: string
    amount: number
    orderAmount: number
    percentage: number
    status: string
    createdAt: string
  }[]
  campaigns: {
    commissionPct: number | null
    discountCode: string | null
    campaign: { id: string; name: string; formStatus: string }
  }[]
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showImport, setShowImport] = useState(false)

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
        setCreators(data.creators ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = creators.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.instagram ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Creators</h1>
          {!loading && <span className="text-sm text-gray-400">{creators.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={13} />
            Import CSV
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-3 lg:px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors"
          >
            <span className="hidden sm:inline">Invite creator</span>
            <span className="sm:hidden">Invite</span>
            <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center">
              <Plus size={12} />
            </div>
          </button>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <button className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
          <Filter size={13} />
          Filter
          <ChevronDown size={12} />
        </button>
        <div className="relative flex-1 sm:flex-none">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="pl-9 pr-4 py-1.5 text-[13px] border border-gray-200 rounded-lg w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <RefreshCw size={18} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[
                      "Creator",
                      "Enrolled",
                      "Status",
                      "Location",
                      "Clicks",
                      "Sales",
                      "Revenue",
                      "Commissions",
                    ].map((col, i) => (
                      <th
                        key={col}
                        className={`px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider ${
                          i >= 4 ? "text-right" : "text-left"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((creator) => {
                    const initials = creator.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()

                    return (
                      <tr
                        key={creator.id}
                        onClick={() => setSelectedCreator(creator)}
                        className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      >
                        {/* Creator */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {creator.avatar ? (
                              <img
                                src={creator.avatar}
                                alt={creator.name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-rose-400">
                                  {initials}
                                </span>
                              </div>
                            )}
                            <span className="text-[13px] font-medium text-gray-900">
                              {creator.name}
                            </span>
                          </div>
                        </td>

                        {/* Enrolled */}
                        <td className="px-5 py-3.5 text-[13px] text-gray-500 whitespace-nowrap">
                          {new Date(creator.createdAt).toLocaleDateString("es-AR", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-[12px] font-medium ${
                              creator.status === "ACTIVE"
                                ? "text-brand-500"
                                : creator.status === "PENDING"
                                  ? "text-amber-500"
                                  : "text-gray-400"
                            }`}
                          >
                            {creator.status === "ACTIVE"
                              ? "Approved"
                              : creator.status === "PENDING"
                                ? "Pending"
                                : "Inactive"}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {creator.city && creator.country
                            ? `${creator.city}, ${creator.country}`
                            : creator.city ||
                              creator.country || <span className="text-gray-300">—</span>}
                        </td>

                        {/* Clicks */}
                        <td className="px-5 py-3.5 text-right text-[13px] text-gray-900">
                          {creator.totalClicks.toLocaleString()}
                        </td>

                        {/* Sales */}
                        <td className="px-5 py-3.5 text-right text-[13px] text-gray-900">
                          {creator.totalSales.toLocaleString()}
                        </td>

                        {/* Revenue */}
                        <td className="px-5 py-3.5 text-right text-[13px] text-gray-900">
                          {formatCurrency(creator.totalRevenue)}
                        </td>

                        {/* Commissions */}
                        <td className="px-5 py-3.5 text-right text-[13px] font-medium text-brand-500">
                          {formatCurrency(creator.totalCommissions)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-[13px] text-gray-400">
                  {search
                    ? `No se encontraron creators con "${search}"`
                    : "Todavía no invitaste ningún creator."}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowInvite(true)}
                    className="mt-3 text-[13px] font-medium text-brand-500 hover:text-brand-600 transition-colors"
                  >
                    Invitar primer creator →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Slide-over detail */}
      {selectedCreator && (
        <CreatorDetail creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
      )}

      {/* Modals */}
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

// ── Invite Modal ───────────────────────────────────────────────────────────────

interface CreatorSearchResult {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  email: string
  instagram: string | null
  alreadyInWorkspace: boolean
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
  const [mode, setMode] = useState<"search" | "invite">("invite")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CreatorSearchResult[]>([])
  const [selected, setSelected] = useState<CreatorSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (mode !== "search" || query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/creators/search?q=${encodeURIComponent(query)}&workspaceId=${workspaceId}`)
        const data = await res.json()
        setResults(data.creators || [])
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, mode, workspaceId])

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      if (mode === "search" && selected) {
        const res = await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            name: selected.firstName ? `${selected.firstName} ${selected.lastName || ""}`.trim() : selected.name,
            firstName: selected.firstName,
            lastName: selected.lastName,
            email: selected.email,
            instagram: selected.instagram || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Error al agregar creator"); return }
      } else {
        const res = await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            name: `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
            email,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Error al invitar creator"); return }
      }
      onCreated()
      onClose()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    !loading &&
    (mode === "search" ? !!selected && !selected.alreadyInWorkspace : !!firstName && !!email)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">Agregar creator</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tab toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 text-xs">
            <button
              onClick={() => { setMode("invite"); setSelected(null); setQuery("") }}
              className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${mode === "invite" ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              Invitar nuevo
            </button>
            <button
              onClick={() => { setMode("search"); setSelected(null) }}
              className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${mode === "search" ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              Ya tiene cuenta
            </button>
          </div>

          {/* Invite new */}
          {mode === "invite" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Camila"
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Apellido</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ruiz"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camila@email.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <p className="text-xs text-gray-400">Le llegará un email para crear su cuenta.</p>
            </div>
          )}

          {/* Search existing */}
          {mode === "search" && (
            <div className="space-y-3">
              {!selected ? (
                <div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por nombre o email..."
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  {results.length > 0 && (
                    <div className="border border-gray-100 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                      {results.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => !c.alreadyInWorkspace && setSelected(c)}
                          disabled={c.alreadyInWorkspace}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${c.alreadyInWorkspace ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 text-xs font-semibold shrink-0">
                            {(c.firstName?.[0] || c.name?.[0] || "?").toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : c.name}
                            </p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                          {c.alreadyInWorkspace && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">Ya está</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {query.length >= 2 && !searching && results.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">
                      No se encontraron resultados.{" "}
                      <button onClick={() => setMode("invite")} className="text-brand-600 font-medium">Invitar nuevo →</button>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold shrink-0">
                    {(selected.firstName?.[0] || selected.name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {selected.firstName ? `${selected.firstName} ${selected.lastName || ""}`.trim() : selected.name}
                    </p>
                    <p className="text-xs text-gray-500">{selected.email}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">Cambiar</button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Guardando..." : mode === "invite" ? "Enviar invitación" : "Agregar creator"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CSV Import Modal ───────────────────────────────────────────────────────────

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return []
  const firstCell = lines[0].split(",")[0].trim().replace(/^"|"$/g, "")
  const dataLines = emailRegex.test(firstCell) ? lines : lines.slice(1)
  return dataLines.map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const email = cols[0] ?? ""
    return {
      email,
      name: cols[1] || email.split("@")[0],
      instagram: cols[2] ?? "",
      commissionPct: parseFloat(cols[3]) || 10,
      valid: emailRegex.test(email),
      error: !emailRegex.test(email) ? "Email inválido" : undefined,
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
    reader.onload = (e) => setRows(parseCSV(e.target?.result as string))
    reader.readAsText(file)
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
        <div className="flex items-center justify-between px-6 py-5 border-b border-hairline">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Importar desde CSV</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Formato: <span className="font-mono">email, nombre, instagram, comision%</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-brand-400">
                <CheckCircle size={18} />
                <span className="text-[14px] font-medium text-gray-900">
                  Importación completada
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Activados", result.imported],
                  ["Invitados", result.invited],
                  ["Ya existían", result.skipped],
                ].map(([label, count]) => (
                  <div key={label} className="border border-hairline rounded-xl p-4 text-center">
                    <p className="text-2xl font-semibold text-gray-900">{count}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {result.errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  {result.errors.map((e) => (
                    <p key={e.email} className="text-[11px] text-red-600">
                      {e.email}: {e.reason}
                    </p>
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
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) processFile(f)
              }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver ? "border-brand-400 bg-brand-50" : "border-[#e8e8e8] hover:border-gray-300"
              }`}
            >
              <Upload size={24} className="mx-auto text-gray-300 mb-3" />
              <p className="text-[13px] font-medium text-gray-600">
                Arrastrá tu CSV o hacé click para subir
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Solo el email es obligatorio.</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) processFile(f)
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-gray-600">
                  <strong className="text-gray-900">{validRows.length}</strong> válidos
                  {rows.length - validRows.length > 0 && (
                    <span className="text-red-500 ml-2">
                      · {rows.length - validRows.length} con error
                    </span>
                  )}
                </p>
                <button
                  onClick={() => {
                    setRows([])
                    if (fileRef.current) fileRef.current.value = ""
                  }}
                  className="text-[12px] text-gray-400 hover:text-gray-600"
                >
                  Cambiar archivo
                </button>
              </div>
              <div className="border border-hairline rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8f8f8] border-b border-hairline">
                      {["Email", "Nombre", "Instagram", "Comisión", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-400"
                        >
                          {h}
                        </th>
                      ))}
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
                        <td className="px-4 py-2.5 text-[12px] text-gray-700">
                          {row.commissionPct}%
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.valid ? (
                            <CheckCircle size={13} className="text-brand-400 mx-auto" />
                          ) : (
                            <AlertCircle size={13} className="text-red-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!result && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-hairline flex items-center justify-between">
            <p className="text-[12px] text-gray-400">
              Los que ya tienen cuenta se activan directo. El resto recibe una invitación.
            </p>
            <button
              onClick={handleImport}
              disabled={loading || validRows.length === 0}
              className="ml-4 flex-shrink-0 px-5 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Importando..." : `Importar ${validRows.length}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
