// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { RelanceDot } from "@/components/pipeline/relance-dot"

describe("RelanceDot", () => {
  it("renders nothing when prochaineRelance is null", () => {
    const { container } = render(<RelanceDot prochaineRelance={null} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when prochaineRelance is in the future", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const { container } = render(<RelanceDot prochaineRelance={future} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders a dot when prochaineRelance is in the past", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const { container } = render(<RelanceDot prochaineRelance={past} />)
    expect(container.firstChild).not.toBeNull()
  })
})
