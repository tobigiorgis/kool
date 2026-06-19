import { describe, it, expect } from "vitest"
import { z, ZodError } from "zod"
import { ok, fail, unauthorized, notFound, badRequest, handleError } from "./response"

describe("ok", () => {
  it("returns status 200 with { ok: true, ...data } by default", async () => {
    const res = ok({ foo: "bar" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, foo: "bar" })
  })

  it("works with no data", async () => {
    const res = ok()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it("respects a passed init (status)", async () => {
    const res = ok({ created: true }, { status: 201 })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({ ok: true, created: true })
  })
})

describe("fail", () => {
  it("returns the given status and { error }", async () => {
    const res = fail("boom", 422)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body).toEqual({ error: "boom" })
  })

  it("includes details when provided", async () => {
    const res = fail("boom", 422, { field: "x" })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body).toEqual({ error: "boom", details: { field: "x" } })
  })
})

describe("unauthorized", () => {
  it("returns 401 with Unauthorized", async () => {
    const res = unauthorized()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: "Unauthorized" })
  })
})

describe("notFound", () => {
  it("returns 404 with default message", async () => {
    const res = notFound()
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })
})

describe("badRequest", () => {
  it("returns 400 with default message", async () => {
    const res = badRequest()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: "Datos inválidos" })
  })
})

describe("handleError", () => {
  it("returns 400 with details for a ZodError", async () => {
    const parsed = z.object({ a: z.string() }).safeParse({ a: 1 })
    expect(parsed.success).toBe(false)
    if (parsed.success) throw new Error("expected parse to fail")
    const zodError: ZodError = parsed.error

    const res = handleError("test-scope", zodError)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.details).toBeDefined()
    expect(Array.isArray(body.details)).toBe(true)
  })

  it("returns 500 generic for a plain Error without leaking the internal message", async () => {
    const res = handleError("test-scope", new Error("super secret internal detail"))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: "Error interno" })
    expect(JSON.stringify(body)).not.toContain("super secret internal detail")
  })
})
