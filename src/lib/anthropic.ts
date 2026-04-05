import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })

  const block = response.content[0]
  if (block.type !== "text") {
    throw new Error("Réponse Claude inattendue")
  }
  return block.text
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
