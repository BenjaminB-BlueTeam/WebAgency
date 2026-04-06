import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
}))

import { adjustSiteCode } from "@/lib/maquette/adjust-site"
import { analyzeWithClaude } from "@/lib/anthropic"
import type { SiteFile } from "@/lib/maquette/generate-site"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CURRENT_FILES: SiteFile[] = [
  { path: "index.html", content: "<html><body><h1 style='color:red'>Accueil</h1></body></html>" },
  { path: "css/style.css", content: "body { margin: 0; background: #fff; }" },
  { path: "js/main.js", content: "console.log('ready');" },
]

const MODIFIED_FILES: SiteFile[] = [
  { path: "index.html", content: "<html><body><h1 style='color:blue'>Accueil</h1></body></html>" },
  { path: "css/style.css", content: "body { margin: 0; background: #fff; }" },
  { path: "js/main.js", content: "console.log('ready');" },
]

const VALID_RESPONSE = JSON.stringify({ files: MODIFIED_FILES })

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("adjustSiteCode", () => {
  beforeEach(() => vi.clearAllMocks())

  it("1. Returns modified files from valid Claude JSON response", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(VALID_RESPONSE)

    const result = await adjustSiteCode(CURRENT_FILES, "Change la couleur principale en bleu")

    expect(result.files).toHaveLength(3)
    expect(result.files[0].content).toContain("color:blue")
  })

  it("2. Parses markdown-wrapped JSON", async () => {
    const wrapped = "```json\n" + VALID_RESPONSE + "\n```"
    vi.mocked(analyzeWithClaude).mockResolvedValue(wrapped)

    const result = await adjustSiteCode(CURRENT_FILES, "Change la couleur principale en bleu")

    expect(result.files).toHaveLength(3)
    expect(result.files[0].content).toContain("color:blue")
  })

  it("3. Returns currentFiles unchanged when Claude fails (fallback)", async () => {
    vi.mocked(analyzeWithClaude).mockRejectedValue(new Error("API error"))

    const result = await adjustSiteCode(CURRENT_FILES, "Change la couleur principale en bleu")

    expect(result.files).toEqual(CURRENT_FILES)
  })

  it("4. Includes instructions in user prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue(VALID_RESPONSE)

    const instructions = "Ajoute un footer avec les mentions légales"
    await adjustSiteCode(CURRENT_FILES, instructions)

    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain(instructions)
  })

  it("5. Returns currentFiles when Claude returns non-JSON text", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("Désolé, je ne comprends pas la demande.")

    const result = await adjustSiteCode(CURRENT_FILES, "Change la couleur")

    expect(result.files).toEqual(CURRENT_FILES)
  })
})
