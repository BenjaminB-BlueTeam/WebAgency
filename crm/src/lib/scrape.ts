// crm/src/lib/scrape.ts

/**
 * Scrape une URL et retourne son contenu en Markdown.
 * Primaire : Firecrawl. Fallback : fetch() + extraction texte brut.
 */
export async function scrapeUrl(url: string): Promise<string> {
  const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;

  if (FIRECRAWL_KEY) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FIRECRAWL_KEY}`,
        },
        body: JSON.stringify({ url, formats: ["markdown"] }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json() as { success: boolean; data?: { markdown?: string } };
        if (data.success && data.data?.markdown) {
          return data.data.markdown.slice(0, 8000); // cap tokens
        }
      }
    } catch {
      // fallthrough to fetch
    }
  }

  // Fallback fetch
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WebAgencyCRM/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags, keep text
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch {
    return "";
  }
}
