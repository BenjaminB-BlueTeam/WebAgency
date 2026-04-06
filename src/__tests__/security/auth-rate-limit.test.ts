// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest"

// Set a valid secret before any module loads (auth.ts validates length at module scope)
vi.stubEnv("CRM_SESSION_SECRET", "a".repeat(32))

// Mock auth so verifyPassword / signToken don't need real bcrypt / jwt
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  verifyPassword: vi.fn(),
  signToken: vi.fn().mockReturnValue("mock-token"),
  setSessionCookie: vi.fn(),
}))

import { checkRateLimit, recordFailedAttempt, clearAttempts, loginAttempts } from "@/app/api/auth/login/route"

describe("Login rate limiter", () => {
  beforeEach(() => { loginAttempts.clear() })

  it("allows first attempt", () => {
    expect(checkRateLimit("192.168.1.1")).toBe(true)
  })

  it("blocks after 5 failed attempts", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt("1.2.3.4")
    expect(checkRateLimit("1.2.3.4")).toBe(false)
  })

  it("clears attempts on success", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt("1.2.3.4")
    clearAttempts("1.2.3.4")
    expect(checkRateLimit("1.2.3.4")).toBe(true)
  })

  it("resets window after 15 minutes", () => {
    // Manually set a record with firstAttempt in the past
    loginAttempts.set("5.6.7.8", { count: 5, firstAttempt: Date.now() - 16 * 60 * 1000 })
    expect(checkRateLimit("5.6.7.8")).toBe(true)
  })

  it("different IPs are independent", () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt("1.1.1.1")
    expect(checkRateLimit("2.2.2.2")).toBe(true)
  })
})
