"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, ArrowLeft } from "lucide-react"

interface ProductRow {
  name: string
  sku: string
  image: string
  price: string
  unitCost: string
  initialStock: string
  productionType: "LOCAL" | "IMPORT"
}

const emptyProduct = (): ProductRow => ({
  name: "",
  sku: "",
  image: "",
  price: "",
  unitCost: "",
  initialStock: "",
  productionType: "LOCAL",
})

export default function NewDropPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [coverImage, setCoverImage] = useState("")
  const [launchDate, setLaunchDate] = useState("")
  const [closeDate, setCloseDate] = useState("")
  const [products, setProducts] = useState<ProductRow[]>([emptyProduct()])

  const updateProduct = (index: number, field: keyof ProductRow, value: string) => {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const removeProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !launchDate) return setError("Nombre y fecha de lanzamiento son obligatorios")

    const validProducts = products.filter((p) => p.name)
    setSaving(true)
    setError(null)

    const res = await fetch("/api/drops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        coverImage: coverImage || undefined,
        launchDate,
        closeDate: closeDate || undefined,
        products: validProducts.map((p) => ({
          name: p.name,
          sku: p.sku || undefined,
          image: p.image || undefined,
          price: parseFloat(p.price) || 0,
          unitCost: p.unitCost ? parseFloat(p.unitCost) : null,
          initialStock: parseInt(p.initialStock) || 0,
          productionType: p.productionType,
        })),
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) return setError(data.error || "Error al crear el Drop")
    router.push(`/dashboard/drops/${data.drop.id}`)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/drops" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nuevo Drop</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configurá el lanzamiento y sus productos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección 1 — Info */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Información del Drop</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Colección Verano 2025"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional del drop"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Cover image (URL)</label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fecha de lanzamiento *</label>
              <input
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fecha de cierre</label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
              />
            </div>
          </div>
        </div>

        {/* Sección 2 — Productos */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Productos</h2>

          {products.map((product, index) => (
            <div key={index} className="border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Producto {index + 1}</span>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => updateProduct(index, "name", e.target.value)}
                    placeholder="Ej: Remera oversize negra"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">SKU</label>
                  <input
                    type="text"
                    value={product.sku}
                    onChange={(e) => updateProduct(index, "sku", e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Imagen URL</label>
                  <input
                    type="url"
                    value={product.image}
                    onChange={(e) => updateProduct(index, "image", e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Precio de venta</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.price}
                    onChange={(e) => updateProduct(index, "price", e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Costo unitario <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.unitCost}
                    onChange={(e) => updateProduct(index, "unitCost", e.target.value)}
                    placeholder="Se calcula desde los gastos"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                  />
                  <p className="text-xs text-gray-400 mt-1">Si cargás gastos, se calcula automáticamente.</p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stock inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={product.initialStock}
                    onChange={(e) => updateProduct(index, "initialStock", e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C46A]/30 focus:border-[#00C46A]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-2">Tipo de producción</label>
                  <div className="flex gap-4">
                    {(["LOCAL", "IMPORT"] as const).map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`productionType-${index}`}
                          value={type}
                          checked={product.productionType === type}
                          onChange={() => updateProduct(index, "productionType", type)}
                          className="accent-[#00C46A]"
                        />
                        <span className="text-sm text-gray-700">
                          {type === "LOCAL" ? "Producción local" : "Importación"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setProducts((prev) => [...prev, emptyProduct()])}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Plus size={14} />
            Agregar producto
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creando..." : "Crear Drop"}
          </button>
          <Link href="/dashboard/drops" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
