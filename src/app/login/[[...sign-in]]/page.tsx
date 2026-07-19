"use client"

import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

export default function LoginPage() {
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
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-gray-900">Ingresá a tu cuenta</h1>
          <p className="text-sm text-gray-500 mt-1">Te llevamos a donde corresponda</p>
        </div>

        {/* Clerk sign in */}
        <div className="flex justify-center">
          <SignIn forceRedirectUrl="/login/redirect" routing="hash" />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="text-gray-600 font-medium hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
