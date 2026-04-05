import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetHtml = vi.fn().mockResolvedValue("https://stitch.example.com/screen.html")
const mockGenerate = vi.fn()
const mockProject = { id: "proj-123", generate: mockGenerate }
const mockCreateProject = vi.fn().mockResolvedValue(mockProject)

vi.mock("@google/stitch-sdk", () => ({
  Stitch: vi.fn().mockImplementation(() => ({ createProject: mockCreateProject })),
}))

vi.mock("@/lib/stitch/buildPrompt", () => ({
  buildStitchPrompt: vi.fn().mockResolvedValue("Design professionnel pour plombier"),
}))

global.fetch = vi.fn().mockResolvedValue({
  text: () => Promise.resolve("<html><body>Screen HTML</body></html>"),
  ok: true,
} as unknown as Response)

import { generateMaquette } from "@/lib/stitch"

const prospect = { nom: "Plomberie Martin", activite: "Plombier", ville: "Steenvoorde" }

describe("generateMaquette", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerate.mockResolvedValue({ getHtml: mockGetHtml })
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: () => Promise.resolve("<html><body>Screen HTML</body></html>"),
      ok: true,
    })
  })

  it("creates a Stitch project with the prospect name", async () => {
    await generateMaquette(prospect)
    expect(mockCreateProject).toHaveBeenCalledWith("Plomberie Martin")
  })

  it("generates exactly 4 screens", async () => {
    await generateMaquette(prospect)
    expect(mockGenerate).toHaveBeenCalledTimes(4)
  })

  it("returns screens named accueil, services, contact, a-propos", async () => {
    const result = await generateMaquette(prospect)
    expect(result.screens.map((s) => s.name)).toEqual(["accueil", "services", "contact", "a-propos"])
  })

  it("fetches HTML from the URL returned by getHtml()", async () => {
    await generateMaquette(prospect)
    expect(global.fetch).toHaveBeenCalledWith("https://stitch.example.com/screen.html")
  })

  it("returns projectId and promptUsed", async () => {
    const result = await generateMaquette(prospect)
    expect(result.projectId).toBe("proj-123")
    expect(result.promptUsed).toBe("Design professionnel pour plombier")
  })

  it("generates each screen with MOBILE device type", async () => {
    await generateMaquette(prospect)
    for (const call of mockGenerate.mock.calls) {
      expect(call[1]).toBe("MOBILE")
    }
  })
})
