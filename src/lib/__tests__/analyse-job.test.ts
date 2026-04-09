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

// In-memory store + mutex to simulate serialized DB transactions
let store: Record<string, string> = {}
let txLock: Promise<void> = Promise.resolve()

const makeTxClient = () => ({
  analyseJob: {
    findUnique: vi.fn(({ where }: any) => {
      const etapes = store[where.id]
      return Promise.resolve(etapes != null ? { etapes } : null)
    }),
    update: vi.fn(({ where, data }: any) => {
      if (data.etapes != null) store[where.id] = data.etapes
      return Promise.resolve({})
    }),
  },
})

vi.mock("@/lib/db", () => ({
  prisma: {
    analyseJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => {
      // Serialize transactions like a real DB would
      const prev = txLock
      let resolve: () => void
      txLock = new Promise<void>((r) => { resolve = r })
      await prev
      try {
        const tx = makeTxClient()
        return await fn(tx)
      } finally {
        resolve!()
      }
    }),
  },
}))

import { prisma } from "@/lib/db"

describe("analyse-job", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store = {}
    txLock = Promise.resolve()
  })

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

  it("appendStep ajoute une étape en JSON via transaction", async () => {
    store["job1"] = "[]"
    const step: AnalyseStep = { nom: "search_competitors", statut: "running", message: "…" }
    await appendStep("job1", step)
    expect(JSON.parse(store["job1"])).toEqual([step])
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("updateStep met à jour la dernière étape portant le même nom via transaction", async () => {
    const existing: AnalyseStep[] = [
      { nom: "search_competitors", statut: "running", message: "Recherche…" },
    ]
    store["job1"] = JSON.stringify(existing)
    await updateStep("job1", "search_competitors", {
      statut: "done",
      message: "8 concurrents trouvés",
      data: { count: 8 },
    })
    const stored = JSON.parse(store["job1"]) as AnalyseStep[]
    expect(stored[0].statut).toBe("done")
    expect(stored[0].data).toEqual({ count: 8 })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("appendStep 10× en parallèle conserve les 10 étapes", async () => {
    store["job1"] = "[]"
    const promises = Array.from({ length: 10 }, (_, i) =>
      appendStep("job1", {
        nom: `step_${i}`,
        statut: "done",
        message: `Step ${i}`,
      })
    )
    await Promise.all(promises)
    const etapes = JSON.parse(store["job1"]) as AnalyseStep[]
    expect(etapes).toHaveLength(10)
    const noms = etapes.map((e) => e.nom).sort()
    expect(noms).toEqual(
      Array.from({ length: 10 }, (_, i) => `step_${i}`).sort()
    )
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
