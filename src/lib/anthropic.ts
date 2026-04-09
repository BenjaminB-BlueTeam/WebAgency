import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 2000

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return err.status === 429 || err.status === 529 || err.status === 503
  }
  return false
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export type ClaudeModel = "claude-sonnet-4-6" | "claude-haiku-4-5-20251001"

export async function analyzeWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024,
  model: ClaudeModel = "claude-sonnet-4-6"
): Promise<string> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      })

      const final = await stream.finalMessage()
      const block = final.content[0]
      if (!block || block.type !== "text") {
        throw new Error("Réponse Claude inattendue")
      }
      return block.text
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        await sleep(INITIAL_DELAY_MS * 2 ** attempt)
        continue
      }
      throw err
    }
  }

  throw lastError
}

export function parseClaudeJSON<T>(response: string): T {
  try {
    return JSON.parse(response) as T
  } catch { /* ignore */ }

  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]) as T
    } catch { /* ignore */ }
  }

  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch { /* ignore */ }
  }

  throw new Error("Impossible de parser la réponse IA")
}
