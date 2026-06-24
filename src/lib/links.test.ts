import { describe, it, expect } from "vitest"
import { SHORT_DOMAIN, buildShortUrl, shortUrlLabel } from "./links"

describe("buildShortUrl", () => {
  it("compone una URL absoluta con protocolo sobre el dominio corto", () => {
    expect(buildShortUrl("camila")).toBe(`https://${SHORT_DOMAIN}/camila`)
  })

  it("agrega el slug verbatim (sin doble slash ni encoding)", () => {
    expect(buildShortUrl("mi-link_2")).toBe(`https://${SHORT_DOMAIN}/mi-link_2`)
  })
})

describe("shortUrlLabel", () => {
  it("muestra dominio/slug sin protocolo", () => {
    expect(shortUrlLabel("camila")).toBe(`${SHORT_DOMAIN}/camila`)
    expect(shortUrlLabel("camila").startsWith("http")).toBe(false)
  })
})
