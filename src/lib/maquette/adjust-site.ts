import { analyzeWithClaude } from "@/lib/anthropic"
import type { SiteFile, SiteFiles } from "@/lib/maquette/generate-site"

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un développeur web senior. Tu reçois le code source complet d'un site vitrine (HTML, CSS, JS) et des instructions de modification.

Tu appliques UNIQUEMENT les modifications demandées, sans toucher au reste.

RÈGLES :
1. Retourner TOUS les fichiers du site, modifiés ou non.
2. N'appliquer QUE les changements demandés — ne pas restructurer, ne pas ajouter de features non demandées.
3. Conserver exactement les mêmes noms de fichiers.
4. Si une instruction est ambiguë, interpréter de manière conservatrice.

Réponds UNIQUEMENT avec un JSON valide (même format que la génération) :
{"files": [{"path": "...", "content": "..."}]}`

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(currentFiles: SiteFile[], instructions: string): string {
  const filesSection = currentFiles
    .map((f) => `=== ${f.path} ===\n${f.content}`)
    .join("\n\n")

  return `Instructions de modification :
${instructions}

Code source actuel :
${filesSection}`
}

// ─── JSON parsing (same strategy as generate-site.ts) ─────────────────────────

function parseResponse(response: string): SiteFiles | null {
  // 1. Try direct parse
  try {
    const parsed = JSON.parse(response) as SiteFiles
    return parsed
  } catch {
    // ignore
  }

  // 2. Try extracting from ```json ... ``` or ``` ... ``` code block
  const fenceMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]) as SiteFiles
      return parsed
    } catch {
      // ignore
    }
  }

  // 3. Try bare JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as SiteFiles
      return parsed
    } catch {
      // ignore
    }
  }

  return null
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(result: unknown): result is SiteFiles {
  if (!result || typeof result !== "object") return false

  const r = result as Record<string, unknown>
  if (!Array.isArray(r.files)) return false
  if (r.files.length === 0) return false
  if (r.files.length > 20) return false

  const files = r.files as unknown[]

  return files.every(
    (f) =>
      f !== null &&
      typeof f === "object" &&
      typeof (f as Record<string, unknown>).path === "string" &&
      typeof (f as Record<string, unknown>).content === "string"
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function adjustSiteCode(
  currentFiles: SiteFile[],
  instructions: string
): Promise<SiteFiles> {
  const userPrompt = buildUserPrompt(currentFiles, instructions)

  let response: string
  try {
    response = await analyzeWithClaude(SYSTEM_PROMPT, userPrompt, 32000)
  } catch {
    return { files: currentFiles }
  }

  const parsed = parseResponse(response)

  if (!parsed || !validate(parsed)) {
    return { files: currentFiles }
  }

  return parsed
}
