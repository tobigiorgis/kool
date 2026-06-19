import { describe, it, expect } from "vitest"
import {
  cn,
  formatNumber,
  formatCurrency,
  formatDate,
  slugify,
  generateDiscountCode,
  getDateRange,
} from "./index"

describe("slugify", () => {
  it("lowercases the text", () => {
    expect(slugify("HELLO")).toBe("hello")
  })

  it("replaces spaces with hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world")
  })

  it("collapses multiple spaces into a single hyphen", () => {
    expect(slugify("hello    world")).toBe("hello-world")
  })

  it("removes accents and diacritics", () => {
    expect(slugify("Canción Español")).toBe("cancion-espanol")
  })

  it("strips special characters", () => {
    expect(slugify("hello@world!#$%")).toBe("helloworld")
  })

  it("preserves digits and existing hyphens", () => {
    expect(slugify("Producto-123")).toBe("producto-123")
  })

  it("trims leading and trailing whitespace", () => {
    expect(slugify("  hola mundo  ")).toBe("hola-mundo")
  })

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("")
  })

  it("returns empty string when only special characters are given", () => {
    expect(slugify("!@#$%^&*()")).toBe("")
  })

  it("truncates to 50 characters", () => {
    const long = "a".repeat(100)
    expect(slugify(long)).toHaveLength(50)
  })

  it("truncates a long slugged sentence to at most 50 chars", () => {
    const input = "the quick brown fox jumps over the lazy dog again and again"
    const result = slugify(input)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result).toBe("the-quick-brown-fox-jumps-over-the-lazy-dog-again-")
  })
})

describe("generateDiscountCode", () => {
  it("uppercases the name and appends the percentage", () => {
    expect(generateDiscountCode("nacho", 20)).toBe("NACHO20")
  })

  it("removes accents from the name", () => {
    expect(generateDiscountCode("José", 15)).toBe("JOSE15")
  })

  it("strips spaces and special characters", () => {
    expect(generateDiscountCode("Juan Pérez!", 10)).toBe("JUANPEREZ10")
  })

  it("truncates the name base to 10 characters before appending pct", () => {
    expect(generateDiscountCode("abcdefghijklmnop", 5)).toBe("ABCDEFGHIJ5")
  })

  it("keeps digits already present in the name", () => {
    expect(generateDiscountCode("user123", 25)).toBe("USER12325")
  })

  it("handles an empty name by producing just the percentage", () => {
    expect(generateDiscountCode("", 30)).toBe("30")
  })

  it("produces different codes when the percentage differs", () => {
    expect(generateDiscountCode("nacho", 10)).not.toBe(generateDiscountCode("nacho", 20))
  })
})

describe("formatNumber", () => {
  it("returns the plain number string for small values", () => {
    expect(formatNumber(0)).toBe("0")
    expect(formatNumber(42)).toBe("42")
    expect(formatNumber(999)).toBe("999")
  })

  it("formats thousands with a K suffix and one decimal", () => {
    expect(formatNumber(1_000)).toBe("1.0K")
    expect(formatNumber(1_500)).toBe("1.5K")
    expect(formatNumber(12_300)).toBe("12.3K")
  })

  it("formats millions with an M suffix and one decimal", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M")
    expect(formatNumber(2_500_000)).toBe("2.5M")
  })

  it("rounds to a single decimal place", () => {
    expect(formatNumber(1_990)).toBe("2.0K")
    expect(formatNumber(1_949)).toBe("1.9K")
  })

  it("uses the M branch at exactly one million, K branch just below it", () => {
    expect(formatNumber(999_999)).toBe("1000.0K")
    expect(formatNumber(1_000_000)).toBe("1.0M")
  })
})

describe("formatCurrency", () => {
  it("formats an amount without fractional digits", () => {
    const result = formatCurrency(1000)
    expect(result).toMatch(/\$/)
    expect(result).not.toMatch(/[.,]\d{2}\b/)
    // es-AR groups thousands with a dot
    expect(result).toContain("1.000")
  })

  it("rounds decimals away (no fractional digits shown)", () => {
    const result = formatCurrency(1234.56)
    expect(result).not.toMatch(/56/)
    expect(result).toContain("1.235")
  })

  it("formats zero", () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/\$/)
    expect(result).toMatch(/0/)
  })

  it("groups large amounts into thousands", () => {
    expect(formatCurrency(1_000_000)).toContain("1.000.000")
  })

  it("honors a different currency code", () => {
    const usd = formatCurrency(1000, "USD")
    expect(usd).toContain("1.000")
    // a currency marker (symbol or code) should be present
    expect(usd).toMatch(/US|\$/)
  })
})

describe("formatDate", () => {
  it("formats a Date into day / short month / year in Spanish", () => {
    const result = formatDate(new Date("2024-03-15T12:00:00Z"))
    // es-AR short month for March is "mar"
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/mar/i)
  })

  it("accepts an ISO date string", () => {
    const result = formatDate("2024-12-25T12:00:00Z")
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/dic/i)
  })
})

describe("getDateRange", () => {
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

  it("returns from/to as ISO date strings (YYYY-MM-DD)", () => {
    const { from, to } = getDateRange("7d")
    expect(from).toMatch(ISO_DATE)
    expect(to).toMatch(ISO_DATE)
  })

  it("sets `to` to today (UTC date portion)", () => {
    const { to } = getDateRange("30d")
    expect(to).toBe(new Date().toISOString().split("T")[0])
  })

  it("computes a 7-day span back from today", () => {
    const { from, to } = getDateRange("7d")
    const diffDays =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(7)
  })

  it("computes a 30-day span back from today", () => {
    const { from, to } = getDateRange("30d")
    const diffDays =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(30)
  })

  it("computes a 90-day span back from today", () => {
    const { from, to } = getDateRange("90d")
    const diffDays =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(90)
  })
})

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("ignores falsy / conditional values", () => {
    expect(cn("base", false && "hidden", null, undefined, "active")).toBe("base active")
  })

  it("resolves conflicting tailwind classes keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("resolves conflicts across different utilities independently", () => {
    expect(cn("text-sm text-red-500", "text-lg")).toBe("text-red-500 text-lg")
  })

  it("supports conditional object syntax from clsx", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active")
  })

  it("flattens arrays of classes", () => {
    expect(cn(["px-2", "py-1"], "m-1")).toBe("px-2 py-1 m-1")
  })

  it("returns an empty string when given no meaningful input", () => {
    expect(cn()).toBe("")
    expect(cn(false, null, undefined)).toBe("")
  })
})
