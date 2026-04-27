export const LOCAL_STAGE_LABELS: Record<string, string> = {
  NOT_STARTED: "No iniciado",
  FABRIC_PURCHASE: "Compra de tela",
  CUTTING: "Corte",
  PRINT: "Estampa",
  SEWING: "Confección",
  PACKAGING: "Empaquetado",
}

export const IMPORT_STAGE_LABELS: Record<string, string> = {
  NOT_STARTED: "No iniciado",
  INITIAL_PAYMENT: "Pago inicial",
  IN_PRODUCTION: "En producción",
  IN_TRANSIT: "En tránsito",
  RECEIVED: "Recibido",
  PACKAGING: "Empaquetado",
}

export const DROP_STATUS_LABELS: Record<string, string> = {
  PRE_LAUNCH: "Pre-lanzamiento",
  ACTIVE: "Activo",
  CLOSED: "Cerrado",
}

export const DROP_STATUS_COLORS: Record<string, string> = {
  PRE_LAUNCH: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
}

export function stageProgressColor(pct: number): string {
  if (pct === 100) return "bg-green-500"
  if (pct >= 60) return "bg-blue-400"
  if (pct >= 20) return "bg-yellow-400"
  return "bg-gray-200"
}
