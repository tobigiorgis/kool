"use client"

import { useState } from "react"
import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { roleHomeUrl } from "@/lib/host"

export default function LoginPage() {
  const [role, setRole] = useState<"brand" | "creator">("brand")

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-gray-900">kool</span>
          <span className="w-2 h-2 rounded-full bg-[#00C46A] mb-0.5" />
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm">
          <button
            onClick={() => setRole("brand")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              role === "brand"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Soy marca
          </button>
          <button
            onClick={() => setRole("creator")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              role === "creator"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Soy creator
          </button>
        </div>

        {/* Copy contextual */}
        <div className="text-center mb-6">
          {role === "brand" ? (
            <>
              <h1 className="text-lg font-semibold text-gray-900">Ingresá a tu workspace</h1>
              <p className="text-sm text-gray-500 mt-1">Gestioná tus creators y campañas</p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900">Portal de creators</h1>
              <p className="text-sm text-gray-500 mt-1">Accedé a tus comisiones y briefings</p>
            </>
          )}
        </div>

        {/* Clerk sign in */}
        <div className="flex justify-center">
          <SignIn forceRedirectUrl={roleHomeUrl(role)} routing="hash" />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          {role === "brand" ? (
            <>
              ¿No tenés cuenta?{" "}
              <Link href="/register" className="text-gray-600 font-medium hover:underline">
                Registrate
              </Link>
            </>
          ) : (
            <>
              ¿Primera vez?{" "}
              <Link
                href="/register?role=creator"
                className="text-gray-600 font-medium hover:underline"
              >
                Creá tu cuenta
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
