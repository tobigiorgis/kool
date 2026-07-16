"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"

const GEOREF = "https://apis.datos.gob.ar/georef/api"

interface Provincia {
  id: string
  nombre: string
}

interface Municipio {
  id: string
  nombre: string
}

async function fetchProvincias(): Promise<Provincia[]> {
  const res = await fetch(`${GEOREF}/provincias?campos=id,nombre&orden=nombre&max=30`)
  const data = await res.json()
  return data.provincias ?? []
}

async function fetchMunicipios(provinciaId: string, q: string): Promise<Municipio[]> {
  const params = new URLSearchParams({
    provincia: provinciaId,
    nombre: q,
    campos: "id,nombre",
    orden: "nombre",
    max: "10",
  })
  const res = await fetch(`${GEOREF}/municipios?${params}`)
  const data = await res.json()
  return data.municipios ?? []
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
const labelCls = "block text-xs font-medium text-gray-700 mb-1.5"

interface Props {
  province: string
  city: string
  onProvinceChange: (v: string) => void
  onCityChange: (v: string) => void
}

export function LocationSelector({ province, city, onProvinceChange, onCityChange }: Props) {
  const [provincias, setProvincias] = useState<Provincia[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [cityInput, setCityInput] = useState(city)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [selectedProvinciaId, setSelectedProvinciaId] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load provincias once
  useEffect(() => {
    fetchProvincias().then(setProvincias)
  }, [])

  // Sync cityInput when city prop changes externally
  useEffect(() => {
    setCityInput(city)
  }, [city])

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nombre = e.target.options[e.target.selectedIndex].text
    const id = e.target.value
    setSelectedProvinciaId(id)
    onProvinceChange(nombre === "Seleccioná una provincia" ? "" : nombre)
    // Reset city when province changes
    setCityInput("")
    onCityChange("")
    setMunicipios([])
  }

  const handleCityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCityInput(val)
    onCityChange(val)

    if (!selectedProvinciaId || val.length < 2) {
      setMunicipios([])
      setShowDropdown(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoadingMunicipios(true)
      try {
        const results = await fetchMunicipios(selectedProvinciaId, val)
        setMunicipios(results)
        setShowDropdown(results.length > 0)
      } finally {
        setLoadingMunicipios(false)
      }
    }, 300)
  }

  const selectMunicipio = (nombre: string) => {
    setCityInput(nombre)
    onCityChange(nombre)
    setShowDropdown(false)
    setMunicipios([])
  }

  // Find current provincia id from name (for controlled select)
  const currentProvinciaId =
    selectedProvinciaId ||
    provincias.find((p) => p.nombre === province)?.id ||
    ""

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Provincia */}
      <div>
        <label className={labelCls}>Provincia</label>
        <div className="relative">
          <select
            value={currentProvinciaId}
            onChange={handleProvinceChange}
            className={`${inputCls} appearance-none pr-8`}
          >
            <option value="">Seleccioná una provincia</option>
            {provincias.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      {/* Ciudad */}
      <div>
        <label className={labelCls}>Ciudad</label>
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={cityInput}
            onChange={handleCityInput}
            onFocus={() => municipios.length > 0 && setShowDropdown(true)}
            placeholder={selectedProvinciaId ? "Escribí para buscar..." : "Primero elegí provincia"}
            disabled={!selectedProvinciaId}
            className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400 pr-7`}
          />
          {loadingMunicipios && (
            <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          )}
          {showDropdown && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {municipios.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={() => selectMunicipio(m.nombre)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
