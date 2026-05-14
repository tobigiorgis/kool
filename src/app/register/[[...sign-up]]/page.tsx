"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SignUp } from "@clerk/nextjs"
import { Suspense } from "react"
import Link from "next/link"
import { Mail, ArrowRight } from "lucide-react"

function RegisterForm() {
  const searchParams = useSearchParams()
  const [role, setRole] = useState<"brand" | "creator">("brand")

  useEffect(() => {
    if (searchParams.get("role") === "creator") setRole("creator")
  }, [searchParams])

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

        {role === "brand" ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-gray-900">Creá tu cuenta</h1>
              <p className="text-sm text-gray-500 mt-1">
                Empezá a gestionar tus creators y campañas
              </p>
            </div>
            <div className="flex justify-center">
              <SignUp afterSignUpUrl="/onboarding" routing="hash" />
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="text-gray-600 font-medium hover:underline">
                Ingresá
              </Link>
            </p>
          </>
        ) : (
          <CreatorRegisterInfo />
        )}
      </div>
    </div>
  )
}

function CreatorRegisterInfo() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h1 className="text-lg font-semibold text-gray-900">Acceso por invitación</h1>
        <p className="text-sm text-gray-500 mt-1">
          Los creators acceden a Kool a través de la marca con la que trabajan
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
            <Mail size={15} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Buscá el email de invitación</p>
            <p className="text-xs text-gray-500 mt-0.5">
              La marca que te sumó a su programa te envió un email con tu link de acceso. Revisá tu bandeja de entrada.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 mb-3">¿Ya tenés una cuenta de creator?</p>
          <Link
            href="/login?role=creator"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            Iniciar sesión
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        ¿Sos una marca o agencia?{" "}
        <Link href="/register" className="text-gray-600 font-medium hover:underline">
          Registrate acá
        </Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
