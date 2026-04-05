import { describe, it, expect, beforeAll, vi } from "vitest"

// Must set env before the module is loaded, since auth.ts reads
// process.env.CRM_SESSION_SECRET at module scope.
vi.stubEnv("CRM_SESSION_SECRET", "test-secret-for-unit-tests-minimum-256-bits-long-enough")

// Dynamic imports so the module is resolved after env is set.
let signToken: () => string
let verifyToken: (token: string) => { user: string; iat: number; exp: number } | null

beforeAll(async () => {
  const auth = await import("@/lib/auth")
  signToken = auth.signToken
  verifyToken = auth.verifyToken
})

describe("signToken", () => {
  it("returns a non-empty string", () => {
    const token = signToken()
    expect(typeof token).toBe("string")
    expect(token.length).toBeGreaterThan(0)
  })

  it("produces a JWT with 3 dot-separated parts", () => {
    const token = signToken()
    const parts = token.split(".")
    expect(parts).toHaveLength(3)
  })

  it("produces tokens that verify successfully", () => {
    const t1 = signToken()
    const t2 = signToken()
    expect(verifyToken(t1)).not.toBeNull()
    expect(verifyToken(t2)).not.toBeNull()
  })
})

describe("verifyToken", () => {
  it("returns payload with user=admin for a valid token", () => {
    const token = signToken()
    const payload = verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.user).toBe("admin")
  })

  it("returns null for a malformed token", () => {
    expect(verifyToken("not.a.token")).toBeNull()
    expect(verifyToken("")).toBeNull()
    expect(verifyToken("totally-invalid")).toBeNull()
  })

  it("returns null for a token signed with the wrong secret", async () => {
    const jwt = (await import("jsonwebtoken")).default
    const badToken = jwt.sign({ user: "admin" }, "wrong-secret", { expiresIn: "7d" })
    expect(verifyToken(badToken)).toBeNull()
  })

  it("returns null for an expired token", async () => {
    const jwt = (await import("jsonwebtoken")).default
    const expired = jwt.sign(
      { user: "admin" },
      process.env.CRM_SESSION_SECRET!,
      { expiresIn: "-1s" }
    )
    expect(verifyToken(expired)).toBeNull()
  })
})
