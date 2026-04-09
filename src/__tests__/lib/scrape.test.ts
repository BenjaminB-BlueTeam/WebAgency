import { describe, it, expect, vi, beforeEach } from "vitest"
import { selectRelevantPages, mapSite, crawlSite } from "@/lib/scrape"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("selectRelevantPages", () => {
  const base = "https://example.com"

  it("inclut toujours la homepage", () => {
    const urls = ["https://example.com", "https://example.com/blog/article-1"]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toContain("https://example.com")
  })

  it("priorise les pages services/tarifs avant les autres", () => {
    const urls = [
      "https://example.com",
      "https://example.com/blog/news",
      "https://example.com/services",
      "https://example.com/tarifs",
      "https://example.com/equipe",
      "https://example.com/realisations",
      "https://example.com/contact",
      "https://example.com/mentions-legales",
    ]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toContain("https://example.com/services")
    expect(result).toContain("https://example.com/tarifs")
    expect(result).not.toContain("https://example.com/mentions-legales")
    expect(result).not.toContain("https://example.com/blog/news")
  })

  it("exclut les pages blog, legales, admin, wp-", () => {
    const urls = [
      "https://example.com",
      "https://example.com/blog/article",
      "https://example.com/mentions-legales",
      "https://example.com/cgv",
      "https://example.com/wp-admin",
      "https://example.com/login",
      "https://example.com/services",
    ]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toEqual(["https://example.com", "https://example.com/services"])
  })

  it("respecte le cap max", () => {
    const urls = [
      "https://example.com",
      "https://example.com/services",
      "https://example.com/tarifs",
      "https://example.com/realisations",
      "https://example.com/equipe",
      "https://example.com/contact",
    ]
    const result = selectRelevantPages(urls, base, 3)
    expect(result).toHaveLength(3)
    expect(result[0]).toBe("https://example.com")
  })

  it("retourne la homepage seule si aucune URL pertinente", () => {
    const urls = [
      "https://example.com",
      "https://example.com/blog/post-1",
      "https://example.com/cgu",
    ]
    const result = selectRelevantPages(urls, base, 5)
    expect(result).toEqual(["https://example.com"])
  })

  it("déduplique la homepage si présente dans les URLs", () => {
    const urls = [
      "https://example.com",
      "https://example.com/",
      "https://example.com/services",
    ]
    const result = selectRelevantPages(urls, base, 5)
    const homepageCount = result.filter(
      (u) => u === "https://example.com" || u === "https://example.com/"
    ).length
    expect(homepageCount).toBe(1)
  })
})

describe("mapSite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FIRECRAWL_API_KEY = "test-key"
  })

  it("retourne les URLs depuis Firecrawl /v1/map", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        links: [
          "https://example.com",
          "https://example.com/services",
          "https://example.com/contact",
        ],
      }),
    })
    const urls = await mapSite("https://example.com")
    expect(urls).toEqual([
      "https://example.com",
      "https://example.com/services",
      "https://example.com/contact",
    ])
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.firecrawl.dev/v1/map",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("retourne [url] en fallback si l'API échoue", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    const urls = await mapSite("https://example.com")
    expect(urls).toEqual(["https://example.com"])
  })

  it("retourne [url] en fallback si fetch throw", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))
    const urls = await mapSite("https://example.com")
    expect(urls).toEqual(["https://example.com"])
  })
})

describe("crawlSite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FIRECRAWL_API_KEY = "test-key"
  })

  it("map + scrape les pages pertinentes en markdown", async () => {
    // mapSite response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        links: [
          "https://example.com",
          "https://example.com/services",
          "https://example.com/blog/post",
          "https://example.com/tarifs",
        ],
      }),
    })
    // scrapeUrl calls (homepage, services, tarifs — blog excluded)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { markdown: "# Accueil" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { markdown: "# Services" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { markdown: "# Tarifs" } }),
      })

    const pages = await crawlSite("https://example.com")
    expect(pages).toHaveLength(3)
    expect(pages.map((p) => p.pageUrl)).toEqual([
      "https://example.com",
      "https://example.com/services",
      "https://example.com/tarifs",
    ])
    expect(pages[0].content).toBe("# Accueil")
  })

  it("retourne au moins la homepage si map échoue", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { markdown: "# Home" } }),
    })

    const pages = await crawlSite("https://example.com")
    expect(pages).toHaveLength(1)
    expect(pages[0].content).toBe("# Home")
  })

  it("exclut les pages dont le scrape échoue", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        links: ["https://example.com", "https://example.com/services"],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { markdown: "# Home" } }),
    })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const pages = await crawlSite("https://example.com")
    expect(pages).toHaveLength(1)
    expect(pages[0].pageUrl).toBe("https://example.com")
  })
})
