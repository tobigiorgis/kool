"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"

interface Campaign {
  id: string
  name: string
  workspace: { name: string }
}

interface Props {
  creatorId: string
  creatorName: string
  campaigns: Campaign[]
}

export function AddToCampaignButton({ creatorId, creatorName, campaigns }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [campaignId, setCampaignId] = useState("")
  const [commissionPct, setCommissionPct] = useState("")
  const [discountCode, setDiscountCode] = useState("")
  const [discountPct, setDiscountPct] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setCampaignId("")
    setCommissionPct("")
    setDiscountCode("")
    setDiscountPct("")
    setError("")
    setSuccess(false)
  }

  const handleOpen = () => {
    reset()
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignId) {
      setError("Seleccioná una campaña.")
      return
    }
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/add-to-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          ...(commissionPct ? { commissionPct: parseFloat(commissionPct) } : {}),
          ...(discountCode ? { discountCode: discountCode.toUpperCase() } : {}),
          ...(discountCode && discountPct ? { discountPct: parseFloat(discountPct) } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al agregar")
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setOpen(false), 1200)
    } catch {
      setError("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
      >
        + Campaña
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">Agregar a campaña</h2>
                <p className="text-[12px] text-gray-400 mt-0.5">{creatorName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {success ? (
              <div className="text-center py-6">
                <p className="text-[14px] font-medium text-green-700">✓ Creator agregado a la campaña</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                    Campaña <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                  >
                    <option value="">Seleccionar campaña...</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.workspace.name} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                      Comisión % <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                      Código <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="CAMILA15"
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 uppercase"
                    />
                  </div>
                </div>

                {discountCode && (
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                      Descuento al cliente % <span className="text-gray-400 font-normal">(para crear el cupón)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 text-[13px] font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={13} className="animate-spin" />}
                    Agregar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
