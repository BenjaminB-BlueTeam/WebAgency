import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024
): Promise<string> {
  // Streaming requis dès qu'on dépasse ~10 min de génération potentielle
  // (cas Opus + max_tokens élevé). On stream et on concatène le texte.
  const stream = client.messages.stream({
    model: "claude-opus-4-6",
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
