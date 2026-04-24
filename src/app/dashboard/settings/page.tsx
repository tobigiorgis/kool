"use client"

import { useState, useEffect } from "react"
import { CheckCircle, CheckCircle2, AlertCircle, ExternalLink, Plug, Store, Zap } from "lucide-react"
import { useSearchParams } from "next/navigation"

interface TiendanubeConnection {
  storeName: string | null
  storeDomain: string | null
  active: boolean
}

interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  tiendanubeConnection: TiendanubeConnection | null
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("integrations")
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => setWorkspace(d.workspace))
  }, [])

  const tnConnected = searchParams.get("tiendanube") === "connected"
  const tnError = searchParams.get("error") === "tiendanube_connection_failed"

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestioná tu workspace e integraciones</p>
      </div>

      {tnConnected && (
        <div className="mb-6 flex items-center gap-2.5 p-4 bg-green-50 border border-green-100 rounded-xl max-w-2xl">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">Tiendanube conectado. Los webhooks ya están activos.</p>
        </div>
      )}
      {tnError && (
        <div className="mb-6 flex items-center gap-2.5 p-4 bg-red-50 border border-red-100 rounded-xl max-w-2xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">Error al conectar Tiendanube. Volvé a intentarlo.</p>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-100">
        {["integrations", "workspace", "billing"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "text-brand-600 border-brand-400"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {tab === "integrations" ? "Integraciones" : tab === "workspace" ? "Workspace" : "Plan & Billing"}
          </button>
        ))}
      </div>

      {activeTab === "integrations" && <IntegrationsTab connection={workspace?.tiendanubeConnection ?? null} workspaceId={workspace?.id ?? null} />}
      {activeTab === "workspace" && <WorkspaceTab workspace={workspace} />}
      {activeTab === "billing" && <BillingTab plan={workspace?.plan ?? "FREE"} />}
    </div>
  )
}

function IntegrationsTab({ connection, workspaceId }: { connection: TiendanubeConnection | null; workspaceId: string | null }) {
  const [connecting, setConnecting] = useState(false)
  const [reinstalling, setReinstalling] = useState(false)

  const handleConnect = () => {
    setConnecting(true)
    window.location.href = "/api/auth/tiendanube"
  }

  const handleReinstallScript = async () => {
    if (!workspaceId) return
    setReinstalling(true)
    try {
      const res = await fetch("/api/debug/reinstall-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })
      const data = await res.json()
      alert(data.ok ? "Script reinstalado correctamente" : "Error: " + data.error)
    } finally {
      setReinstalling(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Tiendanube */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#C0F2DC] flex items-center justify-center flex-shrink-0">
              <span className="text-[#008046] font-bold text-sm">TN</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Tiendanube</h3>
              <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                Conectá tu tienda para trackear conversiones, crear códigos de descuento y gestionar gifting.
              </p>
              {connection?.storeDomain && (
                <a
                  href={`https://${connection.storeDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-600 font-medium mt-1.5 hover:underline"
                >
                  {connection.storeDomain}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            {connection ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  <CheckCircle size={11} />
                  Conectada
                </span>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  Reconectar
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <Plug size={13} />
                {connecting ? "Redirigiendo..." : "Conectar"}
              </button>
            )}
          </div>
        </div>

        {connection && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Webhooks", status: true },
                { label: "Script de tracking", status: true },
                { label: "Catálogo sync", status: false },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center gap-1.5">
                  {status
                    ? <CheckCircle size={12} className="text-brand-500" />
                    : <AlertCircle size={12} className="text-gray-300" />
                  }
                  <span className={`text-xs ${status ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleReinstallScript}
              disabled={reinstalling}
              className="text-xs text-gray-500 underline mt-3 disabled:opacity-50"
            >
              {reinstalling ? "Reinstalando..." : "Reinstalar script de tracking"}
            </button>
          </div>
        )}
      </div>

      {/* Shopify — próximamente */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 opacity-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#d4edda] flex items-center justify-center flex-shrink-0">
              <span className="text-[#00602a] font-bold text-sm">SF</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Shopify</h3>
              <p className="text-xs text-gray-500 mt-0.5">Integración disponible próximamente.</p>
            </div>
          </div>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Próximamente</span>
        </div>
      </div>
    </div>
  )
}

function WorkspaceTab({ workspace }: { workspace: Workspace | null }) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Datos del workspace</h3>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre</label>
          <input
            type="text"
            defaultValue={workspace?.name ?? ""}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Slug</label>
          <div className="flex">
            <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-400">
              kool.link/w/
            </span>
            <input
              type="text"
              defaultValue={workspace?.slug ?? ""}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function BillingTab({ plan }: { plan: string }) {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Plan actual</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{plan}</span>
        </div>
        <button className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
          Actualizar a Pro — USD 49/mes
        </button>
      </div>
    </div>
  )
}
