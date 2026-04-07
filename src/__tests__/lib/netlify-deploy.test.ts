import { describe, it, expect, vi, beforeEach } from "vitest"
import { slugify, deployToNetlify } from "@/lib/netlify-deploy"

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

describe("deployToNetlify", () => {
  const files = [
    { path: "index.html", content: "<html><body>Accueil</body></html>" },
    { path: "services.html", content: "<html><body>Services</body></html>" },
    { path: "css/style.css", content: "body { margin: 0; }" },
    { path: "js/main.js", content: "console.log('ready');" },
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
    await deployToNetlify(files, "Plomberie Martin", "Steenvoorde")
    const firstCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(firstCall[0]).toContain("/sites")
    expect(JSON.parse(firstCall[1].body).name).toBe("fwa-plomberie-martin-steenvoorde")
  })

  it("uploads exactly 4 files", async () => {
    await deployToNetlify(files, "Martin", "Lille")
    const allCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    // call 0: POST /sites, call 1: POST /deploys, calls 2-5: PUT files
    const putCalls = allCalls.slice(2)
    expect(putCalls).toHaveLength(4)
  })

  it("returns url built from site name and siteId", async () => {
    const result = await deployToNetlify(files, "Plomberie Martin", "Steenvoorde")
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

    const result = await deployToNetlify(files, "Martin", "Lille", "existing-site-id")
    expect(result.siteId).toBe("existing-site-id")
    // Only 1 + 4 = 5 calls (no POST /sites)
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(5)
  })
})
