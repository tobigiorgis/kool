"use client"

import { useState, useEffect } from "react"
import { X, Loader2, UserPlus, Trash2 } from "lucide-react"

interface Collaborator {
  id: string
  email: string
  role: "EDITOR" | "VIEWER"
  status: "PENDING" | "ACCEPTED" | "DECLINED"
  user: { name: string | null; avatar: string | null } | null
}

interface Props {
  campaignId: string
  onClose: () => void
}

const ROLE_LABEL = { EDITOR: "Editor", VIEWER: "Viewer" }
const STATUS_LABEL = { PENDING: "Pendiente", ACCEPTED: "Aceptada", DECLINED: "Rechazada" }
const STATUS_COLOR = {
  PENDING: "text-amber-600",
  ACCEPTED: "text-green-600",
  DECLINED: "text-red-500",
}

export function CollaboratorsModal({ campaignId, onClose }: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("VIEWER")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/collaborators`)
      const data = await res.json()
      if (data.collaborators) setCollaborators(data.collaborators)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [campaignId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al invitar")
        return
      }
      setEmail("")
      setSuccess(
        data.alreadyRegistered
          ? "Colaborador agregado. Ya tiene acceso a la campaña."
          : "Invitación enviada por email."
      )
      await load()
    } catch {
      setError("Error de conexión.")
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (collaboratorId: string, newRole: "EDITOR" | "VIEWER") => {
    await fetch(`/api/campaigns/${campaignId}/collaborators/${collaboratorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    await load()
  }

  const handleRemove = async (collaboratorId: string) => {
    await fetch(`/api/campaigns/${campaignId}/collaborators/${collaboratorId}`, {
      method: "DELETE",
    })
    await load()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-gray-400" />
            <h2 className="text-[14px] font-semibold text-gray-900">Colaboradores</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Invite form */}
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                required
                className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
                className="px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-3 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {inviting ? <Loader2 size={13} className="animate-spin" /> : "Invitar"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              <strong>Editor</strong>: puede ver y editar. <strong>Viewer</strong>: solo lectura.
            </p>
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            {success && <p className="text-[12px] text-green-600">{success}</p>}
          </form>

          {/* Collaborators list */}
          <div className="space-y-1">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={16} className="animate-spin text-gray-300" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-[12px] text-gray-400 text-center py-4">
                Todavía no hay colaboradores en esta campaña.
              </p>
            ) : (
              collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group"
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-semibold text-indigo-600 shrink-0">
                    {(c.user?.name ?? c.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">
                      {c.user?.name ?? c.email}
                    </p>
                    {c.user?.name && (
                      <p className="text-[11px] text-gray-400 truncate">{c.email}</p>
                    )}
                  </div>

                  {/* Status */}
                  <span className={`text-[10px] font-medium ${STATUS_COLOR[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>

                  {/* Role selector */}
                  <select
                    value={c.role}
                    onChange={(e) => handleRoleChange(c.id, e.target.value as "EDITOR" | "VIEWER")}
                    className="text-[11px] border border-gray-200 rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
