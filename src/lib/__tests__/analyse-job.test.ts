/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createAnalyseJob,
  appendStep,
  updateStep,
  markJobRunning,
  markJobDone,
  markJobFailed,
  type AnalyseStep,
} from "@/lib/analyse-job"

vi.mock("@/lib/db", () => ({
  prisma: {
    analyseJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"

describe("analyse-job", () => {
  beforeEach(() => vi.clearAllMocks())

  it("createAnalyseJob crée un job pending avec etapes vides", async () => {
    ;(prisma.analyseJob.create as any).mockResolvedValue({
      id: "job1",
      prospectId: "p1",
      statut: "pending",
      etapes: "[]",
    })
    const job = await createAnalyseJob("p1")
    expect(job.id).toBe("job1")
    expect(prisma.analyseJob.create).toHaveBeenCalledWith({
      data: { prospectId: "p1", statut: "pending", etapes: "[]" },
    })
  })

  it("appendStep ajoute une étape en JSON", async () => {
    ;(prisma.analyseJob.findUnique as any).mockResolvedValue({ etapes: "[]" })
    ;(prisma.analyseJob.update as any).mockResolvedValue({})
    const step: AnalyseStep = { nom: "search_competitors", statut: "running", message: "…" }
    await appendStep("job1", step)
    const call = (prisma.analyseJob.update as any).mock.calls[0][0]
    expect(JSON.parse(call.data.etapes)).toEqual([step])
  })

  it("updateStep met à jour la dernière étape portant le même nom", async () => {
    const existing: AnalyseStep[] = [
      { nom: "search_competitors", statut: "running", message: "Recherche…" },
    ]
    ;(prisma.analyseJob.findUnique as any).mockResolvedValue({
      etapes: JSON.stringify(existing),
    })
    ;(prisma.analyseJob.update as any).mockResolvedValue({})
    await updateStep("job1", "search_competitors", {
      statut: "done",
      message: "8 concurrents trouvés",
      data: { count: 8 },
    })
    const call = (prisma.analyseJob.update as any).mock.calls[0][0]
    const stored = JSON.parse(call.data.etapes) as AnalyseStep[]
    expect(stored[0].statut).toBe("done")
    expect(stored[0].data).toEqual({ count: 8 })
  })

  it("markJobDone persiste le résultat", async () => {
    ;(prisma.analyseJob.update as any).mockResolvedValue({})
    await markJobDone("job1", { concurrents: [], synthese: "s", recommandations: [] } as any)
    const call = (prisma.analyseJob.update as any).mock.calls[0][0]
    expect(call.data.statut).toBe("done")
    expect(JSON.parse(call.data.resultat).synthese).toBe("s")
  })

  it("markJobFailed persiste l'erreur", async () => {
    ;(prisma.analyseJob.update as any).mockResolvedValue({})
    await markJobFailed("job1", "boom")
    const call = (prisma.analyseJob.update as any).mock.calls[0][0]
    expect(call.data.statut).toBe("failed")
    expect(call.data.erreur).toBe("boom")
  })

  it("markJobRunning met statut running", async () => {
    ;(prisma.analyseJob.update as any).mockResolvedValue({})
    await markJobRunning("job1")
    expect((prisma.analyseJob.update as any).mock.calls[0][0].data.statut).toBe("running")
  })
})
