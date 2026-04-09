import { describe, it, expect } from "vitest"
import { selectRelevantPages } from "@/lib/scrape"

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
