"use client"

import { useState, useEffect } from "react"
import { SHORT_DOMAIN } from "@/lib/links"

interface Campaign {
  id: string
  name: string
}

interface CampaignCreatorEntry {
  creatorId: string
  discountCode: string | null
  creator: { id: string; firstName: string | null; lastName: string | null; name: string } | null
}

export function CreateLinkModal({
  workspaceId,
  defaultCampaignId,
  defaultCreatorId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  defaultCampaignId?: string
  defaultCreatorId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [destination, setDestination] = useState("")
  const [slug, setSlug] = useState("")
  const [withCoupon, setWithCoupon] = useState(false)
  const [discountCode, setDiscountCode] = useState("")
  const [discountValue, setDiscountValue] = useState("")
  const [campaignId, setCampaignId] = useState(defaultCampaignId ?? "")
  const [creatorId, setCreatorId] = useState(defaultCreatorId ?? "")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [creatorsInCampaign, setCreatorsInCampaign] = useState<CampaignCreatorEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/campaigns?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => {})
  }, [workspaceId])

  useEffect(() => {
    if (!campaignId) {
      setCreatorsInCampaign([])
      if (!defaultCreatorId) setCreatorId("")
      return
    }
    fetch(`/api/campaigns/${campaignId}/creators`)
      .then((r) => r.json())
      .then((data) => {
        const list: CampaignCreatorEntry[] = data.campaignCreators || []
        setCreatorsInCampaign(list)
        // Auto-fill discount code from creator
        const cc = list.find((c) => c.creatorId === creatorId)
        if (cc?.discountCode) {
          setDiscountCode(cc.discountCode)
          setWithCoupon(true)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const handleCreatorChange = (id: string) => {
    setCreatorId(id)
    if (id) {
      const cc = creatorsInCampaign.find((c) => c.creatorId === id)
      if (cc?.discountCode) {
        setDiscountCode(cc.discountCode)
        setWithCoupon(true)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          destination,
          slug: slug || undefined,
          campaignId: campaignId || undefined,
          creatorId: creatorId || undefined,
          discountCode: discountCode || undefined,
          discountType: "percentage",
          discountValue: discountValue ? parseFloat(discountValue) : undefined,
          commissionWithoutCoupon: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear el link")
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
          <h2 className="text-base font-semibold text-gray-900">Crear nuevo link</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">URL de destino</label>
            <input
              type="url"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="https://mitienda.tiendanube.com/producto"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Slug personalizado
            </label>
            <div className="flex">
              <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
                {SHORT_DOMAIN}/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="mi-link (opcional)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Campaña <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value)
                if (!defaultCreatorId) setCreatorId("")
              }}
              disabled={!!defaultCampaignId}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">Sin campaña</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {campaignId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Creator <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={creatorId}
                onChange={(e) => handleCreatorChange(e.target.value)}
                disabled={!!defaultCreatorId}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Sin creator</option>
                {creatorsInCampaign.map((cc) => (
                  <option key={cc.creatorId} value={cc.creatorId}>
                    {cc.creator?.firstName || cc.creator?.name} {cc.creator?.lastName ?? ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs font-medium text-gray-700">Agregar cupón para clientes</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  El cliente recibe un código de descuento al comprar
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={withCoupon}
                onClick={() => {
                  setWithCoupon(!withCoupon)
                  if (withCoupon) {
                    setDiscountCode("")
                    setDiscountValue("")
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${withCoupon ? "bg-brand-400" : "bg-gray-200"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${withCoupon ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            {withCoupon && (
              <div className="flex gap-3 px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 mt-3">
                    Código de descuento
                  </label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="CAMILA15"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent font-mono bg-white"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 mt-3">
                    % descuento
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="10"
                      className="flex-1 px-3 py-2 text-sm border border-r-0 border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                    />
                    <span className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-r-lg text-sm text-gray-500">
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !destination}
              className="flex-1 px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
