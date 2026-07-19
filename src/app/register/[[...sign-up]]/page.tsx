"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SignUp } from "@clerk/nextjs"
import Link from "next/link"

function Logo() {
  return (
    <div className="mb-8 text-center">
      <div className="inline-flex items-center gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-gray-900">kool</span>
        <span className="w-2 h-2 rounded-full bg-[#FB7185] mb-0.5" />
      </div>
    </div>
  )
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const [role, setRole] = useState<"brand" | "creator" | null>(null)
  const token = searchParams.get("token")
  const roleParam = searchParams.get("role")

  useEffect(() => {
    if (roleParam === "creator" || (token && roleParam !== "collaborator")) setRole("creator")
    else if (roleParam === "brand") setRole("brand")
  }, [searchParams, token, roleParam])

  // Invite-link flow: creator activates directly, no role picker
  if (token && roleParam !== "collaborator") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Logo />
        <div className="w-full max-w-sm">
          <CreatorSignUp token={token} />
        </div>
      </div>
    )
  }

  // Collaborator invite flow: straight to dashboard/collaborations after sign-up
  if (roleParam === "collaborator" && token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Logo />
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
      <Logo />
      <div className="w-full max-w-sm">
        {role === null ? (
          <RolePicker onSelect={setRole} />
        ) : (
          <>
            <button
              onClick={() => setRole(null)}
              className="text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
            >
              ← Cambiar
            </button>
            {role === "brand" ? <BrandSignUp /> : <CreatorSelfSignUp />}
          </>
        )}
      </div>
    </div>
  )
}

function RolePicker({ onSelect }: { onSelect: (role: "brand" | "creator") => void }) {
  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Creá tu cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">Contanos quién sos para empezar</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => onSelect("brand")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all duration-fast"
        >
          <span className="text-3xl">🏢</span>
          <p className="font-semibold text-sm text-gray-900">Soy marca</p>
          <p className="text-xs text-gray-400 text-center">Gestioná creators y campañas</p>
        </button>
        <button
          onClick={() => onSelect("creator")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all duration-fast"
        >
          <span className="text-3xl">✨</span>
          <p className="font-semibold text-sm text-gray-900">Soy creator</p>
          <p className="text-xs text-gray-400 text-center">Accedé a tus links y comisiones</p>
        </button>
      </div>
      <p className="text-center text-xs text-gray-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-gray-600 font-medium hover:underline">
          Ingresá
        </Link>
      </p>
    </div>
  )
}

function BrandSignUp() {
  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Creá tu cuenta</h1>
        <p className="text-sm text-gray-500 mt-1">Empezá a gestionar tus creators y campañas</p>
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
