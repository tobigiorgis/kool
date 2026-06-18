import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { logger } from "@/lib/logger"

/** Respuesta de éxito. Mantiene el shape existente `{ ok: true, ...data }`. */
export function ok(data: Record<string, unknown> = {}, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init)
}

/** Respuesta de error. Shape `{ error }` o `{ error, details }`. */
export function fail(error: string, status: number, details?: unknown) {
  return NextResponse.json(details !== undefined ? { error, details } : { error }, { status })
}

export const unauthorized = () => fail("Unauthorized", 401)
export const notFound = (message = "Not found") => fail(message, 404)
export const badRequest = (message = "Datos inválidos", details?: unknown) =>
  fail(message, 400, details)

/**
 * Handler de errores estándar para catch blocks de API routes.
 * - ZodError => 400 con details.
 * - Cualquier otro => loguea y devuelve 500 genérico (sin filtrar detalles internos).
 */
export function handleError(scope: string, error: unknown) {
  if (error instanceof ZodError) return fail("Datos inválidos", 400, error.errors)
  logger.error(scope, error)
  return fail("Error interno", 500)
}
