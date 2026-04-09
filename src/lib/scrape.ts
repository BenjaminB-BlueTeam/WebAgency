const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v1/scrape"

export async function scrapeUrl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error("Clé API Firecrawl non configurée")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(FIRECRAWL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ["html"] }),
      signal: controller.signal,
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Clé API Firecrawl invalide")
      if (res.status === 402) throw new Error("Quota Firecrawl épuisé")
      throw new Error(`Erreur Firecrawl (${res.status})`)
    }

    const data = await res.json()
    return data.data?.html ?? ""
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout Firecrawl (30s)")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

const PRIORITY_1 = /service|prestation|tarif|prix|offre|formule/i
const PRIORITY_2 = /realisation|projet|portfolio|reference|galerie/i
const PRIORITY_3 = /about|qui-sommes|equipe|contact|agence|entreprise|a-propos/i
const EXCLUDE = /blog|article|actu|mentions-legales|cgv|cgu|politique|cookie|login|admin|wp-|panier|cart|checkout/i

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "")
}

function scorePath(url: string): number {
  const path = new URL(url).pathname
  if (EXCLUDE.test(path)) return -1
  if (PRIORITY_1.test(path)) return 3
  if (PRIORITY_2.test(path)) return 2
  if (PRIORITY_3.test(path)) return 1
  return 0
}

export function selectRelevantPages(
  urls: string[],
  baseUrl: string,
  max: number = 5
): string[] {
  const normalizedBase = normalizeUrl(baseUrl)
  const seen = new Set<string>()
  const result: string[] = []

  const homepage = urls.find(
    (u) => normalizeUrl(u) === normalizedBase || normalizeUrl(u) === normalizedBase + "/"
  ) ?? baseUrl
  result.push(normalizeUrl(homepage))
  seen.add(normalizeUrl(homepage))

  const scored = urls
    .filter((u) => !seen.has(normalizeUrl(u)))
    .map((u) => ({ url: u, score: scorePath(u) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)

  for (const entry of scored) {
    if (result.length >= max) break
    const norm = normalizeUrl(entry.url)
    if (!seen.has(norm)) {
      result.push(norm)
      seen.add(norm)
    }
  }

  return result
}
