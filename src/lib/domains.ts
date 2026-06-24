// Dominio canónico de short links — strip de protocolo por si el env var
// viene con https:// por error (ej: "https://joinkool.co" → "joinkool.co")
export const SHORT_DOMAIN = (
  process.env.NEXT_PUBLIC_SHORT_DOMAIN || "joinkool.co"
).replace(/^https?:\/\//, "")
