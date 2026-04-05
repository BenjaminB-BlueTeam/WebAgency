// src/__tests__/lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
  parseClaudeJSON: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
  })),
}))

import { generateProspectionEmail, buildEmailHtml, sendEmail } from "@/lib/email"
import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"
import { Resend } from "resend"

const mockProspect = {
  nom: "Garage Martin",
  activite: "garagiste",
  ville: "Steenvoorde",
  email: "martin@garage.fr",
  telephone: "03 28 50 94 90",
}

describe("generateProspectionEmail", () => {
  beforeEach(() => vi.clearAllMocks())

  it("includes activite and ville in the user prompt", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect)
    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("garagiste")
    expect(userPrompt).toContain("Steenvoorde")
  })

  it("includes demoUrl in prompt when maquette provided", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect, { demoUrl: "https://demo.netlify.app", version: 1 })
    const [, userPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(userPrompt).toContain("https://demo.netlify.app")
  })

  it("returns sujet and corps from Claude response", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "Votre site web", corps: "Bonjour Martin" })
    const result = await generateProspectionEmail(mockProspect)
    expect(result.sujet).toBe("Votre site web")
    expect(result.corps).toBe("Bonjour Martin")
  })
})

describe("buildEmailHtml", () => {
  it("returns HTML string containing corps text", () => {
    const html = buildEmailHtml("Bonjour, je vous contacte.", mockProspect)
    expect(typeof html).toBe("string")
    expect(html).toContain("Bonjour, je vous contacte.")
  })

  it("includes demo link when maquetteDemoUrl provided", () => {
    const html = buildEmailHtml("Test", mockProspect, "https://demo.netlify.app")
    expect(html).toContain("https://demo.netlify.app")
    expect(html).toContain("Voir la démo")
  })

  it("excludes demo section when maquetteDemoUrl is null", () => {
    const html = buildEmailHtml("Test", mockProspect, null)
    expect(html).not.toContain("Voir la démo")
  })

  it("contains Benjamin B. signature", () => {
    const html = buildEmailHtml("Test", mockProspect)
    expect(html).toContain("Benjamin B.")
    expect(html).toContain("Flandre Web Agency")
  })
})

describe("sendEmail", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns true on successful send", async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: "123" }, error: null })
    vi.mocked(Resend).mockImplementation(function () { return { emails: { send: mockSend } } as unknown as Resend })
    const result = await sendEmail("test@example.com", "Sujet", "<p>HTML</p>")
    expect(result).toBe(true)
  })

  it("returns false when Resend returns an error", async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: null, error: { message: "send failed" } })
    vi.mocked(Resend).mockImplementation(function () { return { emails: { send: mockSend } } as unknown as Resend })
    const result = await sendEmail("test@example.com", "Sujet", "<p>HTML</p>")
    expect(result).toBe(false)
  })
})
