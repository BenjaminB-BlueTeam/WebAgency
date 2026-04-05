import { describe, it, expect, vi, beforeEach } from "vitest"
import { slugify, injectNav, deployToNetlify } from "@/lib/netlify-deploy"

describe("slugify", () => {
  it("lowercases and removes accents", () => {
    expect(slugify("Plomberie Généreux")).toBe("plomberie-genereux")
  })

  it("replaces spaces and special chars with hyphens", () => {
    expect(slugify("Jean & Martin SARL")).toBe("jean-martin-sarl")
  })

  it("truncates to 63 chars", () => {
    expect(slugify("a".repeat(100))).toHaveLength(63)
  })

  it("removes leading and trailing hyphens", () => {
    expect(slugify("---test---")).toBe("test")
  })
})

describe("injectNav", () => {
  it("injects nav before </body>", () => {
    const result = injectNav("<html><body><h1>Hello</h1></body></html>", "accueil")
    expect(result).toContain("<nav")
    expect(result.indexOf("<nav")).toBeLessThan(result.indexOf("</body>"))
  })

  it("highlights the current page link in white (#ffffff)", () => {
    const result = injectNav("<body></body>", "services")
    expect(result).toMatch(/href="services\.html"[^>]*#ffffff/)
  })

  it("shows other pages in grey (#737373)", () => {
    const result = injectNav("<body></body>", "accueil")
    expect(result).toMatch(/href="services\.html"[^>]*#737373/)
  })

  it("appends nav even when no </body> tag", () => {
    const result = injectNav("<div>content</div>", "accueil")
    expect(result).toContain("<nav")
  })

  it("includes links to all 4 pages", () => {
    const result = injectNav("<body></body>", "accueil")
    expect(result).toContain("index.html")
    expect(result).toContain("services.html")
    expect(result).toContain("contact.html")
    expect(result).toContain("a-propos.html")
  })
})

describe("deployToNetlify", () => {
  const screens = [
    { name: "accueil", html: "<html><body>Accueil</body></html>" },
    { name: "services", html: "<html><body>Services</body></html>" },
    { name: "contact", html: "<html><body>Contact</body></html>" },
    { name: "a-propos", html: "<html><body>A propos</body></html>" },
  ]

  beforeEach(() => {
    process.env.NETLIFY_TOKEN = "test-token"
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "site-abc" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "deploy-xyz" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      })
  })

  it("creates a Netlify site with slugified name", async () => {
    await deployToNetlify(screens, "Plomberie Martin", "Steenvoorde")
    const firstCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(firstCall[0]).toContain("/sites")
    expect(JSON.parse(firstCall[1].body).name).toBe("fwa-plomberie-martin-steenvoorde")
  })

  it("uploads exactly 4 files", async () => {
    await deployToNetlify(screens, "Martin", "Lille")
    const allCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    // call 0: POST /sites, call 1: POST /deploys, calls 2-5: PUT files
    const putCalls = allCalls.slice(2)
    expect(putCalls).toHaveLength(4)
  })

  it("returns url built from site name and siteId", async () => {
    const result = await deployToNetlify(screens, "Plomberie Martin", "Steenvoorde")
    expect(result.url).toBe("https://fwa-plomberie-martin-steenvoorde.netlify.app")
    expect(result.siteId).toBe("site-abc")
  })

  it("reuses existing siteId when provided (skips site creation)", async () => {
    // Reset mock: first call is now the deploy (not site creation)
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "deploy-xyz" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") })

    const result = await deployToNetlify(screens, "Martin", "Lille", "existing-site-id")
    expect(result.siteId).toBe("existing-site-id")
    // Only 1 + 4 = 5 calls (no POST /sites)
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(5)
  })
})
