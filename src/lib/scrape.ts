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
