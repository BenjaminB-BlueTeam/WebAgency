// @vitest-environment node
import { describe, it, expect } from "vitest"

// Re-implement the logic here as a pure function test
// (mirrors isAllowedRedirectUrl in src/app/api/maquettes/[id]/preview/route.ts)
function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname.endsWith(".netlify.app") ||
        parsed.hostname.endsWith(".netlify.com"))
    )
  } catch {
    return false
  }
}

describe("Maquette preview URL validation", () => {
  it("allows valid netlify.app URL", () => {
    expect(isAllowedRedirectUrl("https://fwa-test.netlify.app")).toBe(true)
  })
  it("allows valid netlify.com URL", () => {
    expect(isAllowedRedirectUrl("https://fwa-test.netlify.com")).toBe(true)
  })
  it("blocks http URL", () => {
    expect(isAllowedRedirectUrl("http://fwa-test.netlify.app")).toBe(false)
  })
  it("blocks non-netlify domain", () => {
    expect(isAllowedRedirectUrl("https://evil.com/phishing")).toBe(false)
  })
  it("blocks malformed URL", () => {
    expect(isAllowedRedirectUrl("not-a-url")).toBe(false)
  })
  it("blocks internal network URL", () => {
    expect(isAllowedRedirectUrl("https://192.168.1.1/malicious")).toBe(false)
  })
})
