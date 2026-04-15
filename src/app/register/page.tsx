import { SignUp } from "@clerk/nextjs"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="text-2xl font-bold tracking-tight text-gray-900">kool</span>
          <span className="w-2 h-2 rounded-full bg-brand-400" />
        </div>
        <SignUp />
      </div>
    </div>
  )
}
