"use client"

import { useState } from "react"
import { CheckCircle, ExternalLink, Plug, AlertCircle } from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("integrations")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
      </div>

      {/* Tabs */}
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

      {activeTab === "integrations" && <IntegrationsTab />}
      {activeTab === "workspace" && <WorkspaceTab />}
      {activeTab === "billing" && <BillingTab />}
    </div>
  )
}

function IntegrationsTab() {
  // En producción esto viene del servidor
  const [tiendanubeConnected, setTiendanubeConnected] = useState(false)
  const [storeDomain, setStoreDomain] = useState("")

  const connectTiendanube = () => {
    // Redirige al flow OAuth de Tiendanube
    // En producción: window.location.href = `/api/auth/tiendanube?workspaceId=${workspaceId}`
    window.location.href = "/api/auth/tiendanube"
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Tiendanube */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#C0F2DC] flex items-center justify-center">
              <span className="text-[#008046] font-bold text-sm">TN</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Tiendanube</h3>
              <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
                Conectá tu tienda para trackear conversiones, crear códigos de descuento
                automáticamente y gestionar gifting.
              </p>
              {tiendanubeConnected && storeDomain && (
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle size={12} className="text-brand-500" />
                  <span className="text-xs text-brand-600 font-medium">{storeDomain}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            {tiendanubeConnected ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  <CheckCircle size={11} />
                  Conectada
                </span>
                <button className="text-xs text-gray-500 hover:text-red-500 transition-colors">
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                onClick={connectTiendanube}
                className="flex items-center gap-1.5 bg-brand-400 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-brand-500 transition-colors"
              >
                <Plug size={13} />
                Conectar
              </button>
            )}
          </div>
        </div>

        {tiendanubeConnected && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
            {[
              { label: "Webhooks", status: true },
              { label: "Script de tracking", status: true },
              { label: "Catálogo sync", status: false },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center gap-1.5">
                {status ? (
                  <CheckCircle size={12} className="text-brand-500" />
                ) : (
                  <AlertCircle size={12} className="text-gray-300" />
                )}
                <span className={`text-xs ${status ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shopify — próximamente */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 opacity-60">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#d4edda] flex items-center justify-center">
              <span className="text-[#00602a] font-bold text-sm">SF</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Shopify</h3>
              <p className="text-xs text-gray-500 mt-0.5">Integración disponible próximamente.</p>
            </div>
          </div>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
            Próximamente
          </span>
        </div>
      </div>
    </div>
  )
}

function WorkspaceTab() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Datos del workspace</h3>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre</label>
          <input
            type="text"
            defaultValue="Mi Agencia"
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
              defaultValue="mi-agencia"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
        <button className="px-4 py-2 text-sm font-medium bg-brand-400 text-white rounded-lg hover:bg-brand-500">
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

function BillingTab() {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Plan actual</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">Free</span>
        </div>
        <div className="space-y-2 mb-6">
          {[
            ["Links", "10 / 10"],
            ["Clics/mes", "1.000 / 1.000"],
            ["Creators", "3 / 3"],
            ["Tiendas conectadas", "1 / 1"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 bg-brand-400 text-white rounded-lg text-sm font-medium hover:bg-brand-500">
          Actualizar a Pro — USD 49/mes
        </button>
      </div>
    </div>
  )
}
