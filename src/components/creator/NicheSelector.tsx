"use client"

import { CREATOR_NICHES, NICHE_CATEGORIES, MAX_NICHES } from "@/lib/constants/niches"

interface NicheSelectorProps {
  selected: string[]
  onChange: (niches: string[]) => void
}

export function NicheSelector({ selected, onChange }: NicheSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((n) => n !== id))
    } else if (selected.length < MAX_NICHES) {
      onChange([...selected, id])
    }
  }

  return (
    <div className="space-y-4">
      {NICHE_CATEGORIES.map((category) => (
        <div key={category}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {category}
          </p>
          <div className="flex flex-wrap gap-2">
            {CREATOR_NICHES.filter((n) => n.category === category).map((niche) => {
              const isSelected = selected.includes(niche.id)
              const isDisabled = !isSelected && selected.length >= MAX_NICHES
              return (
                <button
                  key={niche.id}
                  type="button"
                  onClick={() => toggle(niche.id)}
                  disabled={isDisabled}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    isSelected
                      ? "bg-brand-500 text-white border-brand-500"
                      : isDisabled
                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:text-brand-600"
                  }`}
                >
                  {niche.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-400">
        {selected.length}/{MAX_NICHES} nichos seleccionados
      </p>
    </div>
  )
}
