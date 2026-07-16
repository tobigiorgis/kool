"use client"

import { useEffect, useState } from "react"
import { Loader2, Check, LogOut } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { LocationSelector } from "@/components/creator/LocationSelector"

interface CreatorProfile {
  name: string
  email: string
  phone: string | null
  instagram: string | null
  tiktok: string | null
  bankAlias: string | null
  shippingAddress: string | null
  shippingCity: string | null
  shippingProvince: string | null
  shippingZipCode: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<Partial<CreatorProfile>>({})
  const { signOut } = useClerk()

  useEffect(() => {
    fetch("/api/creator/me")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d)
        setForm(d)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/creator/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof CreatorProfile, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Profile</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tu información personal y de cobro</p>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="lg:hidden flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-gray-200"
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
      <div className="border-t border-gray-200" />

      {/* Social */}
      <Section title="Redes sociales">
        <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => set("instagram", v)} placeholder="@tuhandle" />
        <Field label="TikTok" value={form.tiktok ?? ""} onChange={(v) => set("tiktok", v)} placeholder="@tuhandle" />
        <Field label="Teléfono" value={form.phone ?? ""} onChange={(v) => set("phone", v)} placeholder="+54 9 11 1234 5678" />
      </Section>

      {/* Shipping */}
      <Section title="Dirección de envío">
        <Field label="Dirección" value={form.shippingAddress ?? ""} onChange={(v) => set("shippingAddress", v)} placeholder="Av. Corrientes 1234" />
        <LocationSelector
          province={form.shippingProvince ?? ""}
          city={form.shippingCity ?? ""}
          onProvinceChange={(v) => set("shippingProvince", v)}
          onCityChange={(v) => set("shippingCity", v)}
        />
        <Field label="Código postal" value={form.shippingZipCode ?? ""} onChange={(v) => set("shippingZipCode", v)} placeholder="C1000" />
      </Section>

      {/* Payments */}
      <Section title="Datos de cobro">
        <Field
          label="Alias / CBU"
          value={form.bankAlias ?? ""}
          onChange={(v) => set("bankAlias", v)}
          placeholder="tu.alias.mercadopago"
        />
        <p className="text-[12px] text-gray-400">Usamos este dato para enviarte tus pagos.</p>
      </Section>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} />
          ) : null}
          {saved ? "Guardado" : "Guardar cambios"}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <p className="text-[13px] font-semibold text-gray-900 mb-1">{title}</p>
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[12px] text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300"
      />
    </div>
  )
}
