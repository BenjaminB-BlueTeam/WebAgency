// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AnalyseProgress } from "@/components/prospects/analyse-progress"
import type { AnalyseStep } from "@/lib/analyse-job"

describe("AnalyseProgress", () => {
  it("affiche un loader pour une étape running", () => {
    const etapes: AnalyseStep[] = [
      { nom: "search_competitors", statut: "running", message: "Recherche..." },
    ]
    render(<AnalyseProgress etapes={etapes} />)
    expect(screen.getByText("Recherche...")).toBeTruthy()
    expect(screen.getByTestId("step-loader-search_competitors")).toBeTruthy()
  })

  it("affiche une coche verte pour une étape done", () => {
    const etapes: AnalyseStep[] = [
      { nom: "search_competitors", statut: "done", message: "8 concurrents trouvés" },
    ]
    render(<AnalyseProgress etapes={etapes} />)
    expect(screen.getByText("8 concurrents trouvés")).toBeTruthy()
    expect(screen.getByTestId("step-done-search_competitors")).toBeTruthy()
  })

  it("affiche un warning pour une étape failed", () => {
    const etapes: AnalyseStep[] = [
      { nom: "scrape_competitors:X", statut: "failed", message: "Site inaccessible" },
    ]
    render(<AnalyseProgress etapes={etapes} />)
    expect(screen.getByText("Site inaccessible")).toBeTruthy()
    expect(screen.getByTestId("step-failed-scrape_competitors:X")).toBeTruthy()
  })
})
