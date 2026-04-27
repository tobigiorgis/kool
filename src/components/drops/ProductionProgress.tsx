"use client"

import { LOCAL_STAGE_LABELS, IMPORT_STAGE_LABELS, stageProgressColor } from "@/lib/drops/stages"
import { getProductProgress } from "@/lib/drops/profitability"

interface Props {
  productionType: "LOCAL" | "IMPORT"
  productionStage?: string | null
  importStage?: string | null
  showLabel?: boolean
  size?: "sm" | "md"
}

export function ProductionProgress({
  productionType,
  productionStage,
  importStage,
  showLabel = true,
  size = "md",
}: Props) {
  const progress = getProductProgress({ productionType, productionStage, importStage })
  const labels = productionType === "LOCAL" ? LOCAL_STAGE_LABELS : IMPORT_STAGE_LABELS
  const currentStage = productionType === "LOCAL" ? productionStage : importStage
  const label = labels[currentStage || "NOT_STARTED"]

  const barHeight = size === "sm" ? "h-1.5" : "h-2"
  const textSize = size === "sm" ? "text-xs" : "text-sm"
  const barColor = stageProgressColor(progress)

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={`${textSize} text-gray-600`}>{label}</span>
          <span className={`${textSize} font-medium text-gray-900`}>{progress}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full ${barHeight}`}>
        <div
          className={`${barHeight} rounded-full transition-all ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
