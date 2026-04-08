/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn().mockResolvedValue({ id: "u1" }) }))
vi.mock("@/lib/db", () => ({
  prisma: {
    prospect: { findUnique: vi.fn() },
  },
}))
vi.mock("@/lib/analyse-job", () => ({
  createAnalyseJob: vi.fn(),
}))
vi.mock("@/lib/run-analyse-job", () => ({
  runAnalyseJob: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from "@/app/api/prospects/[id]/analyse/route"
import { prisma } from "@/lib/db"
import { createAnalyseJob } from "@/lib/analyse-job"
import { runAnalyseJob } from "@/lib/run-analyse-job"

describe("POST /api/prospects/[id]/analyse", () => {
  beforeEach(() => vi.clearAllMocks())

  it("404 si prospect introuvable", async () => {
    ;(prisma.prospect.findUnique as any).mockResolvedValue(null)
    const res = await POST(new Request("http://x") as any, { params: Promise.resolve({ id: "x" }) })
    expect(res.status).toBe(404)
  })

  it("crée un job et retourne son id immédiatement", async () => {
    ;(prisma.prospect.findUnique as any).mockResolvedValue({
      id: "p1",
      nom: "Boulangerie",
      activite: "boulangerie",
      ville: "Hazebrouck",
      placeId: null,
    })
    ;(createAnalyseJob as any).mockResolvedValue({ id: "job1" })

    const res = await POST(new Request("http://x") as any, { params: Promise.resolve({ id: "p1" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.jobId).toBe("job1")
    expect(runAnalyseJob).toHaveBeenCalledWith({ jobId: "job1", prospect: expect.any(Object) })
  })
})
