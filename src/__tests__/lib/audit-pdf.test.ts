import { describe, it, expect } from "vitest"
import { renderToBuffer } from "@react-pdf/renderer"
import { AuditPdfDocument } from "@/lib/pdf/audit-pdf"

describe("AuditPdfDocument", () => {
  it("génère un Buffer PDF non vide", async () => {
    const buffer = await renderToBuffer(
      AuditPdfDocument({
        prospect: {
          nom: "Garage Martin",
          activite: "Garagiste",
          ville: "Steenvoorde",
          adresse: "12 rue de Cassel",
          telephone: "0320000000",
          noteGoogle: 4.5,
        },
        analyse: {
          concurrents: [
            {
              nom: "Concurrent A",
              siteUrl: "https://a.com",
              forces: ["Bon site"],
              faiblesses: ["Pas de tarifs"],
              positionnement: "Généraliste",
            },
          ],
          synthese: "Marché peu concurrentiel",
          recommandations: ["Mettre en avant les délais"],
        },
      })
    )
    expect(buffer.length).toBeGreaterThan(1000)
    // Signature PDF
    expect(buffer.slice(0, 4).toString()).toBe("%PDF")
  }, 30000)
})
