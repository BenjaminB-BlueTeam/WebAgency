// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { ProspectAnalyseTab } from "@/components/prospects/prospect-analyse-tab"

const baseProspect = {
  id: "p1",
  analyses: [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

describe("ProspectAnalyseTab polling", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("affiche la progression après lancement et premier poll", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { jobId: "j1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "j1",
            statut: "running",
            etapes: [
              { nom: "search_competitors", statut: "running", message: "Recherche..." },
            ],
            resultat: null,
            erreur: null,
          },
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: "j1",
            statut: "running",
            etapes: [
              { nom: "search_competitors", statut: "running", message: "Recherche..." },
            ],
            resultat: null,
            erreur: null,
          },
        }),
      })
    vi.stubGlobal("fetch", fetchMock)

    render(<ProspectAnalyseTab prospect={baseProspect} />)
    fireEvent.click(screen.getByText("Lancer l'analyse concurrentielle"))

    await waitFor(() => expect(screen.getByText("Recherche...")).toBeTruthy())
  })
})
