// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ClientCreateModal } from "@/components/pipeline/client-create-modal"

describe("ClientCreateModal", () => {
  it("affiche le nom du prospect et les champs", () => {
    render(
      <ClientCreateModal
        prospectName="Boulangerie Dupont"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText(/Boulangerie Dupont/)).toBeTruthy()
    expect(screen.getByText("URL du site")).toBeTruthy()
    expect(screen.getByText("Type d'offre")).toBeTruthy()
    expect(screen.getByText("Date de livraison")).toBeTruthy()
  })

  it("appelle onCancel quand on clique Annuler", () => {
    const onCancel = vi.fn()
    render(
      <ClientCreateModal
        prospectName="X"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText("Annuler"))
    expect(onCancel).toHaveBeenCalled()
  })

  it("refuse une URL invalide", async () => {
    const onConfirm = vi.fn()
    render(
      <ClientCreateModal
        prospectName="X"
        initialSiteUrl="pas une url"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText("Créer le client"))
    await screen.findByText(/URL n'est pas valide/i)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("appelle onConfirm avec les valeurs valides", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <ClientCreateModal
        prospectName="X"
        initialSiteUrl="https://exemple.fr"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText("Créer le client"))
    await new Promise((r) => setTimeout(r, 0))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        siteUrl: "https://exemple.fr",
        offreType: "VITRINE",
      })
    )
  })
})
