"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SignUp } from "@clerk/nextjs"
import Link from "next/link"

function RegisterForm() {
  const searchParams = useSearchParams()
  const [role, setRole] = useState<"brand" | "creator">("brand")
  const token = searchParams.get("token")
  const roleParam = searchParams.get("role")

  useEffect(() => {
    if (roleParam === "creator" || (token && roleParam !== "collaborator")) setRole("creator")
  }, [searchParams, token, roleParam])

  // Collaborator invite flow: straight to dashboard/collaborations after sign-up
  if (roleParam === "collaborator" && token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-gray-900">kool</span>
            <span className="w-2 h-2 rounded-full bg-[#FB7185] mb-0.5" />
          </div>
        </div>
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-lg font-semibold text-gray-900">Accedé a la colaboración</h1>
            <p className="text-sm text-gray-500 mt-1">
              Creá tu cuenta o iniciá sesión para aceptar la invitación
            </p>
          </div>
          <div className="flex justify-center">
            <SignUp
              forceRedirectUrl={`/dashboard/collaborations?token=${token}`}
              routing="hash"
            />
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            ¿Ya tenés cuenta?{" "}
            <Link
              href={`/login?redirect=/dashboard/collaborations?token=${token}`}
              className="text-gray-600 font-medium hover:underline"
            >
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-gray-900">kool</span>
          <span className="w-2 h-2 rounded-full bg-[#FB7185] mb-0.5" />
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Toggle — hidden when arriving via token link */}
        {!token && (
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm">
            <button
              onClick={() => setRole("brand")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-fast ${
                role === "brand"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Soy marca
            </button>
            <button
              onClick={() => setRole("creator")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-fast ${
                role === "creator"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Soy creator
            </button>
          </div>
        )}

        {role === "brand" ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-gray-900">Creá tu cuenta</h1>
              <p className="text-sm text-gray-500 mt-1">
                Empezá a gestionar tus creators y campañas
              </p>
            </div>
            <div className="flex justify-center">
              <SignUp forceRedirectUrl="/onboarding" routing="hash" />
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="text-gray-600 font-medium hover:underline">
                Ingresá
              </Link>
            </p>
          </>
        ) : token ? (
          <CreatorSignUp token={token} />
        ) : (
          <CreatorSelfSignUp />
        )}
      </div>
    </div>
  )
}

function CreatorSignUp({ token }: { token: string }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Activá tu cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">Creá tu cuenta para acceder a tu programa</p>
      </div>
      <div className="flex justify-center">
        <SignUp forceRedirectUrl={`/onboarding/creator?token=${token}`} routing="hash" />
      </div>
    </div>
  )
}

function CreatorSelfSignUp() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Creá tu cuenta de creator</h1>
        <p className="text-sm text-gray-500 mt-1">Accedé a tus comisiones, links y briefings</p>
      </div>

      <div className="flex justify-center">
        <SignUp forceRedirectUrl="/onboarding/creator" routing="hash" />
      </div>

      <p className="text-center text-xs text-gray-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login?role=creator" className="text-gray-600 font-medium hover:underline">
          Ingresá
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
