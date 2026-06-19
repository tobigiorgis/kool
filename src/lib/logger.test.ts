import { describe, it, expect, vi, afterEach } from "vitest"
import { logger } from "./logger"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("logger", () => {
  it("does not throw on info/warn/error", () => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => logger.info("scope", "msg")).not.toThrow()
    expect(() => logger.warn("scope", "msg")).not.toThrow()
    expect(() => logger.error("scope", "msg")).not.toThrow()
  })

  it("redacts sensitive meta keys but keeps normal ones", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    logger.error("scope", "msg", {
      token: "secret123",
      apiKey: "x",
      normal: "ok",
    })

    expect(errorSpy).toHaveBeenCalled()
    const serialized = JSON.stringify(errorSpy.mock.calls)

    // sensitive values must not leak
    expect(serialized).not.toContain("secret123")
    // apiKey value "x" must be redacted, not passed through
    expect(serialized).toContain("[redacted]")
    // non-sensitive values are preserved
    expect(serialized).toContain("ok")
  })

  it("redacts a token-like key value", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    logger.error("scope", "msg", { token: "deadbeef-token-value" })

    const serialized = JSON.stringify(errorSpy.mock.calls)
    expect(serialized).not.toContain("deadbeef-token-value")
    expect(serialized).toContain("[redacted]")
  })
})
