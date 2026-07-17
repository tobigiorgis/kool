"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Trophy,
  Plus,
  Trash2,
  X,
  Check,
  DollarSign,
  Package,
  Gift,
  RefreshCw,
  Pause,
  Play,
  Flag,
  ChevronDown,
  Pencil,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Metric = "SALES" | "REVENUE"
type RewardType = "CASH" | "PRODUCT" | "CUSTOM"
type BountyStatus = "ACTIVE" | "PAUSED" | "ENDED"
type AchievementStatus = "ACHIEVED" | "FULFILLED"

interface Tier {
  id: string
  threshold: number
  rewardType: RewardType
  rewardValue: number | null
  rewardProductId: string | null
  rewardProductName: string | null
  rewardDescription: string | null
  order: number
}

interface Achievement {
  id: string
  tierId: string
  creatorId: string
  status: AchievementStatus
  progressValue: number
  achievedAt: string
  fulfilledAt: string | null
  creator: { id: string; name: string; email: string }
}

interface Bounty {
  id: string
  name: string
  description: string | null
  metric: Metric
  status: BountyStatus
  tiers: Tier[]
  achievements: Achievement[]
}

// ── Helpers ──────────────────────────────────────

function formatThreshold(value: number, metric: Metric): string {
  return metric === "REVENUE"
    ? formatCurrency(value)
    : `${value} ${value === 1 ? "venta" : "ventas"}`
}

function rewardLabel(t: {
  rewardType: RewardType
  rewardValue: number | null
  rewardProductName: string | null
  rewardDescription: string | null
}): string {
  if (t.rewardType === "CASH" && t.rewardValue != null)
    return `${formatCurrency(t.rewardValue)} en efectivo`
  if (t.rewardType === "PRODUCT")
    return t.rewardProductName || t.rewardDescription || "Producto de regalo"
  return t.rewardDescription || "Recompensa"
}

function RewardIcon({ type }: { type: RewardType }) {
  if (type === "CASH") return <DollarSign size={13} className="text-emerald-500" />
  if (type === "PRODUCT") return <Package size={13} className="text-violet-500" />
  return <Gift size={13} className="text-rose-400" />
}

const METRIC_LABEL: Record<Metric, string> = { SALES: "Por ventas", REVENUE: "Por revenue" }
const STATUS_CFG: Record<BountyStatus, { label: string; cls: string }> = {
  ACTIVE: { label: "Activo", cls: "bg-green-100 text-green-700" },
  PAUSED: { label: "Pausado", cls: "bg-amber-100 text-amber-700" },
  ENDED: { label: "Finalizado", cls: "bg-gray-100 text-gray-500" },
}

// ── Main ─────────────────────────────────────────

export default function BountiesTab({ campaignId }: { campaignId: string }) {
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingBounty, setEditingBounty] = useState<Bounty | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/campaigns/${campaignId}/bounties`)
      .then((r) => r.json())
      .then((d) => setBounties(d.bounties ?? []))
      .finally(() => setLoading(false))
  }, [campaignId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">
          {loading ? "—" : `${bounties.length} bounty${bounties.length !== 1 ? "s" : ""}`}
          <span className="ml-2 text-gray-400">· Recompensas por alcanzar objetivos de venta</span>
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Trophy size={14} />
          Nuevo bounty
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={18} className="animate-spin text-gray-400" />
        </div>
      ) : bounties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Trophy size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Todavía no hay bounties en esta campaña.</p>
          <p className="text-xs text-gray-400 mt-1 mb-3">
            Ej: &ldquo;Si llegás a 5 ventas, te regalamos un perfume&rdquo;.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Crear primer bounty
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bounties.map((b) => (
            <BountyCard key={b.id} bounty={b} campaignId={campaignId} onChange={load} onEdit={setEditingBounty} />
          ))}
        </div>
      )}

      {showCreate && (
        <BountyModal
          campaignId={campaignId}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}

      {editingBounty && (
        <BountyModal
          campaignId={campaignId}
          bounty={editingBounty}
          onClose={() => setEditingBounty(null)}
          onSaved={() => { setEditingBounty(null); load() }}
        />
      )}
    </div>
  )
}

// ── Bounty card ──────────────────────────────────

function BountyCard({
  bounty,
  campaignId,
  onChange,
  onEdit,
}: {
  bounty: Bounty
  campaignId: string
  onChange: () => void
  onEdit: (b: Bounty) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const cfg = STATUS_CFG[bounty.status]

  const patchBounty = async (data: Record<string, unknown>) => {
    setBusy(true)
    try {
      await fetch(`/api/campaigns/${campaignId}/bounties/${bounty.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      onChange()
    } finally {
      setBusy(false)
      setMenuOpen(false)
    }
  }

  const remove = async () => {
    if (!confirm("¿Eliminar este bounty? Se borrarán también los logros asociados.")) return
    setBusy(true)
    try {
      await fetch(`/api/campaigns/${campaignId}/bounties/${bounty.id}`, { method: "DELETE" })
      onChange()
    } finally {
      setBusy(false)
    }
  }

  const markFulfilled = async (achievementId: string, status: AchievementStatus) => {
    await fetch(
      `/api/campaigns/${campaignId}/bounties/${bounty.id}/achievements/${achievementId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    )
    onChange()
  }

  const achievedByTier = (tierId: string) => bounty.achievements.filter((a) => a.tierId === tierId)
  const pending = bounty.achievements.filter((a) => a.status === "ACHIEVED")

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Trophy size={16} className="text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{bounty.name}</p>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
                {cfg.label}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                {METRIC_LABEL[bounty.metric]}
              </span>
            </div>
            {bounty.description && (
              <p className="text-xs text-gray-400 mt-0.5">{bounty.description}</p>
            )}
          </div>
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={busy}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Acciones <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44">
                <MenuItem icon={Pencil} label="Editar" onClick={() => { setMenuOpen(false); onEdit(bounty) }} />
                {bounty.status !== "ACTIVE" && (
                  <MenuItem
                    icon={Play}
                    label="Activar"
                    onClick={() => patchBounty({ status: "ACTIVE" })}
                  />
                )}
                {bounty.status === "ACTIVE" && (
                  <MenuItem
                    icon={Pause}
                    label="Pausar"
                    onClick={() => patchBounty({ status: "PAUSED" })}
                  />
                )}
                {bounty.status !== "ENDED" && (
                  <MenuItem
                    icon={Flag}
                    label="Finalizar"
                    onClick={() => patchBounty({ status: "ENDED" })}
                  />
                )}
                <MenuItem icon={Trash2} label="Eliminar" danger onClick={remove} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="px-5 pb-3 space-y-2">
        {bounty.tiers.map((t) => {
          const count = achievedByTier(t.id).length
          return (
            <div
              key={t.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/60 border border-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-gray-900 w-24 shrink-0">
                  {formatThreshold(t.threshold, bounty.metric)}
                </span>
                <span className="text-gray-300">→</span>
                <span className="flex items-center gap-1.5 text-[13px] text-gray-700">
                  <RewardIcon type={t.rewardType} />
                  {rewardLabel(t)}
                </span>
              </div>
              <span className="text-[11px] text-gray-400">
                {count} {count === 1 ? "logro" : "logros"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Achievements / fulfillment */}
      {bounty.achievements.length > 0 && (
        <div className="border-t border-gray-50 px-5 py-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Logros{" "}
            {pending.length > 0 && (
              <span className="text-amber-500">· {pending.length} por entregar</span>
            )}
          </p>
          <div className="space-y-1.5">
            {bounty.achievements.map((a) => {
              const tier = bounty.tiers.find((t) => t.id === a.tierId)
              return (
                <div key={a.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-rose-400">
                        {a.creator.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{a.creator.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {tier ? formatThreshold(tier.threshold, bounty.metric) : "—"} ·{" "}
                        {tier ? rewardLabel(tier) : ""}
                      </p>
                    </div>
                  </div>
                  {a.status === "FULFILLED" ? (
                    <button
                      onClick={() => markFulfilled(a.id, "ACHIEVED")}
                      className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full hover:bg-green-100 transition-colors"
                      title="Marcar como no entregado"
                    >
                      <Check size={12} /> Entregado
                    </button>
                  ) : (
                    <button
                      onClick={() => markFulfilled(a.id, "FULFILLED")}
                      className="text-[11px] font-medium text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      Marcar entregado
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-2 text-[13px] text-left transition-colors ${
        danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

// ── Create modal ─────────────────────────────────

interface DraftTier {
  threshold: string
  rewardType: RewardType
  rewardValue: string
  rewardProductName: string
  rewardDescription: string
}

const emptyTier = (): DraftTier => ({
  threshold: "",
  rewardType: "CUSTOM",
  rewardValue: "",
  rewardProductName: "",
  rewardDescription: "",
})

function BountyModal({
  campaignId,
  bounty,
  onClose,
  onSaved,
}: {
  campaignId: string
  bounty?: Bounty
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!bounty
  const [name, setName] = useState(bounty?.name ?? "")
  const [description, setDescription] = useState(bounty?.description ?? "")
  const [metric, setMetric] = useState<Metric>(bounty?.metric ?? "SALES")
  const [tiers, setTiers] = useState<DraftTier[]>(
    bounty?.tiers.length
      ? bounty.tiers.map((t) => ({
          threshold: t.threshold.toString(),
          rewardType: t.rewardType,
          rewardValue: t.rewardValue?.toString() ?? "",
          rewardProductName: t.rewardProductName ?? "",
          rewardDescription: t.rewardDescription ?? "",
        }))
      : [emptyTier()]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const updateTier = (i: number, patch: Partial<DraftTier>) =>
    setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const addTier = () => setTiers((ts) => [...ts, emptyTier()])
  const removeTier = (i: number) => setTiers((ts) => ts.filter((_, j) => j !== i))

  const submit = async () => {
    setError("")
    const built = tiers
      .filter((t) => t.threshold.trim() !== "")
      .map((t) => ({
        threshold: parseFloat(t.threshold),
        rewardType: t.rewardType,
        rewardValue: t.rewardType === "CASH" ? parseFloat(t.rewardValue) || null : null,
        rewardProductName: t.rewardType === "PRODUCT" ? t.rewardProductName || null : null,
        rewardDescription: t.rewardDescription || null,
      }))

    if (!name.trim()) return setError("Poné un nombre al bounty.")
    if (built.length === 0) return setError("Agregá al menos un escalón con su umbral.")
    for (const t of built) {
      if (isNaN(t.threshold) || t.threshold <= 0)
        return setError("Los umbrales deben ser números mayores a 0.")
      if (t.rewardType === "CASH" && !t.rewardValue)
        return setError("Indicá el monto de la recompensa en efectivo.")
      if (t.rewardType === "PRODUCT" && !t.rewardProductName)
        return setError("Indicá el producto de regalo.")
      if (t.rewardType === "CUSTOM" && !t.rewardDescription)
        return setError("Describí la recompensa.")
    }

    setLoading(true)
    try {
      const url = isEdit
        ? `/api/campaigns/${campaignId}/bounties/${bounty!.id}`
        : `/api/campaigns/${campaignId}/bounties`
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null, metric, tiers: built }),
      })
      if (!res.ok) { setError("No se pudo guardar el bounty."); return }
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? "Editar bounty" : "Nuevo bounty"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Vendé y ganá"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Descripción</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Se mide por</label>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 text-xs">
              {(["SALES", "REVENUE"] as Metric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
                    metric === m
                      ? "bg-white shadow-sm text-gray-900 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m === "SALES" ? "Cantidad de ventas" : "Monto de revenue"}
                </button>
              ))}
            </div>
          </div>

          {/* Tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Escalones</label>
              <button
                type="button"
                onClick={addTier}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <Plus size={13} /> Agregar escalón
              </button>
            </div>

            <div className="space-y-3">
              {tiers.map((t, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2.5 relative">
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 w-14 shrink-0">
                      {metric === "REVENUE" ? "Al llegar a $" : "Al llegar a"}
                    </span>
                    <input
                      type="number"
                      value={t.threshold}
                      onChange={(e) => updateTier(i, { threshold: e.target.value })}
                      placeholder={metric === "REVENUE" ? "100000" : "5"}
                      className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {metric === "REVENUE" ? "de revenue" : "ventas"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 w-14 shrink-0">Recompensa</span>
                    <select
                      value={t.rewardType}
                      onChange={(e) => updateTier(i, { rewardType: e.target.value as RewardType })}
                      className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                    >
                      <option value="CUSTOM">Personalizada</option>
                      <option value="PRODUCT">Producto físico</option>
                      <option value="CASH">Efectivo</option>
                    </select>
                  </div>

                  {t.rewardType === "CASH" && (
                    <input
                      type="number"
                      value={t.rewardValue}
                      onChange={(e) => updateTier(i, { rewardValue: e.target.value })}
                      placeholder="Monto en ARS — ej: 20000"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  )}
                  {t.rewardType === "PRODUCT" && (
                    <input
                      value={t.rewardProductName}
                      onChange={(e) => updateTier(i, { rewardProductName: e.target.value })}
                      placeholder="Producto — ej: Perfume edición limitada"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  )}
                  {t.rewardType === "CUSTOM" && (
                    <input
                      value={t.rewardDescription}
                      onChange={(e) => updateTier(i, { rewardDescription: e.target.value })}
                      placeholder="Describí la recompensa — ej: 50% off en tu próxima compra"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-[13px] text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-brand-500 px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Trophy size={14} />}
            {isEdit ? "Guardar cambios" : "Crear bounty"}
          </button>
        </div>
      </div>
    </div>
  )
}
