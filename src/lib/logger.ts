type Level = "debug" | "info" | "warn" | "error"

const isDev = process.env.NODE_ENV !== "production"
const SENSITIVE = /(token|secret|password|code|authorization|api[_-]?key|cookie)/i

type Meta = Record<string, unknown>

function redact(meta?: Meta): Meta | undefined {
  if (!meta) return undefined
  const out: Meta = {}
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SENSITIVE.test(k) ? "[redacted]" : v
  }
  return out
}

function emit(level: Level, scope: string, message: unknown, meta?: Meta): void {
  const safeMeta = redact(meta)
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log

  if (isDev) {
    sink(`[${level.toUpperCase()}] ${scope}:`, message, safeMeta ?? "")
    return
  }

  sink(
    JSON.stringify({
      level,
      scope,
      message: message instanceof Error ? message.message : message,
      ...(message instanceof Error && message.stack ? { stack: message.stack } : {}),
      ...(safeMeta ? { meta: safeMeta } : {}),
      ts: new Date().toISOString(),
    })
  )
}

/**
 * Logger estructurado. En dev: legible. En prod: JSON line por log.
 * Redacta claves sensibles (token/secret/code/...) automáticamente del meta.
 * Es el ÚNICO lugar donde se permite console.* — el resto del código usa esto.
 */
export const logger = {
  debug: (scope: string, message: unknown, meta?: Meta) => {
    if (isDev) emit("debug", scope, message, meta)
  },
  info: (scope: string, message: unknown, meta?: Meta) => emit("info", scope, message, meta),
  warn: (scope: string, message: unknown, meta?: Meta) => emit("warn", scope, message, meta),
  error: (scope: string, message: unknown, meta?: Meta) => emit("error", scope, message, meta),
}
