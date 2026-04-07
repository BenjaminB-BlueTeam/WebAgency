// src/__tests__/lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/anthropic", () => ({
  analyzeWithClaude: vi.fn(),
  parseClaudeJSON: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: vi.fn(),
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

  it("uses relance prompt when isRelance:true with no relanceType", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect, null, null, true)
    const [systemPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(systemPrompt).toContain("relance")
  })

  it("uses maquette prompt when relanceType is MAQUETTE", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect, null, null, true, "MAQUETTE")
    const [systemPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(systemPrompt).toContain("maquette")
  })

  it("uses RDV prompt when relanceType is RDV", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect, null, null, true, "RDV")
    const [systemPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(systemPrompt).toContain("RDV")
  })

  it("uses devis prompt when relanceType is DEVIS", async () => {
    vi.mocked(analyzeWithClaude).mockResolvedValue("{}")
    vi.mocked(parseClaudeJSON).mockReturnValue({ sujet: "S", corps: "C" })
    await generateProspectionEmail(mockProspect, null, null, true, "DEVIS")
    const [systemPrompt] = vi.mocked(analyzeWithClaude).mock.calls[0]
    expect(systemPrompt).toContain("devis")
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

  it("returns success with messageId on successful send", async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: "123" }, error: null })
    vi.mocked(Resend).mockImplementation(function () { return { emails: { send: mockSend } } as unknown as Resend })
    const result = await sendEmail("test@example.com", "Sujet", "<p>HTML</p>")
    expect(result).toEqual({ success: true, messageId: "123" })
  })

  it("returns failure with error message when Resend returns an error", async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: null, error: { message: "send failed" } })
    vi.mocked(Resend).mockImplementation(function () { return { emails: { send: mockSend } } as unknown as Resend })
    const result = await sendEmail("test@example.com", "Sujet", "<p>HTML</p>")
    expect(result).toEqual({ success: false, error: "send failed" })
  })

  it("returns failure on timeout", async () => {
    vi.useFakeTimers()
    const hangingPromise = new Promise<never>(() => {}) // never resolves
    const mockSend = vi.fn().mockReturnValue(hangingPromise)
    vi.mocked(Resend).mockImplementation(function () { return { emails: { send: mockSend } } as unknown as Resend })

    const resultPromise = sendEmail("test@example.com", "Sujet", "<p>HTML</p>")
    vi.advanceTimersByTime(15001)
    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.error).toBe("Email timeout (15s)")
    vi.useRealTimers()
  })

  it("does not log recipient email address in error", async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockSend = vi.fn().mockResolvedValue({ data: null, error: { message: "send failed" } })
    vi.mocked(Resend).mockImplementation(function () { return { emails: { send: mockSend } } as unknown as Resend })

    await sendEmail("secret@example.com", "Sujet", "<p>HTML</p>")

    // Check that no console.error call contains the recipient email
    for (const call of consoleSpy.mock.calls) {
      const logString = call.map(String).join(" ")
      expect(logString).not.toContain("secret@example.com")
    }
    consoleSpy.mockRestore()
  })
})
