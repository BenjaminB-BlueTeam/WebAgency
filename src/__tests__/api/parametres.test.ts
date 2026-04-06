/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/params", () => ({ setParam: vi.fn() }))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { PATCH } from "@/app/api/parametres/route"
import { requireAuth } from "@/lib/auth"
import { setParam } from "@/lib/params"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/parametres", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any as NextRequest
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PATCH /api/parametres", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(undefined)
    vi.mocked(setParam).mockResolvedValue(undefined)
  })

  it("1. returns 400 when cle is missing", async () => {
    const req = makeRequest({ valeur: "test" })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it("2. returns 400 when valeur is too long (>10000 chars)", async () => {
    const req = makeRequest({ cle: "agence.nom", valeur: "x".repeat(10001) })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it("3. saves and returns updated value", async () => {
    const req = makeRequest({ cle: "agence.nom", valeur: "Flandre Web" })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual({ cle: "agence.nom", valeur: "Flandre Web" })
    expect(setParam).toHaveBeenCalledWith("agence.nom", "Flandre Web")
  })

  it("4. returns 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))
    const req = makeRequest({ cle: "agence.nom", valeur: "test" })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })
})
