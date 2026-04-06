// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AddProspectModal } from "@/components/prospects/add-prospect-modal"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const baseProps = {
  onCancel: vi.fn(),
  onSuccess: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", vi.fn())
})

describe("AddProspectModal", () => {
  it("renders all form fields", () => {
    render(<AddProspectModal {...baseProps} />)

    expect(screen.getByText("Ajouter un prospect")).toBeTruthy()
    expect(screen.getByPlaceholderText(/Nom de l'entreprise/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/Plombier, Restaurant/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/Paris, Lyon/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/06 12 34 56 78/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/contact@exemple\.fr/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/https:\/\//)).toBeTruthy()
  })

  it("Ajouter button is disabled when nom is empty", () => {
    render(<AddProspectModal {...baseProps} />)
    const btn = screen.getByRole("button", { name: /Ajouter/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it("Ajouter button is enabled when nom has a value", () => {
    render(<AddProspectModal {...baseProps} />)
    const nomInput = screen.getByPlaceholderText(/Nom de l'entreprise/)
    fireEvent.change(nomInput, { target: { value: "Test SARL" } })
    const btn = screen.getByRole("button", { name: /Ajouter/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it("calls onCancel when Annuler is clicked", () => {
    const onCancel = vi.fn()
    render(<AddProspectModal {...baseProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("shows inline error when API returns 409", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 409,
        json: async () => ({ error: "Un prospect avec ce nom dans cette ville existe déjà" }),
      })
    )

    render(<AddProspectModal {...baseProps} />)

    const nomInput = screen.getByPlaceholderText(/Nom de l'entreprise/)
    fireEvent.change(nomInput, { target: { value: "Dupont Plomberie" } })

    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }))

    await waitFor(() => {
      expect(screen.getByText("Un prospect avec ce nom dans cette ville existe déjà")).toBeTruthy()
    })
  })

  it("calls onSuccess and toast on 201 response", async () => {
    const { toast } = await import("sonner")
    const onSuccess = vi.fn()

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 201,
        json: async () => ({ data: { id: "abc", nom: "Test SARL" } }),
      })
    )

    render(<AddProspectModal {...baseProps} onSuccess={onSuccess} />)

    const nomInput = screen.getByPlaceholderText(/Nom de l'entreprise/)
    fireEvent.change(nomInput, { target: { value: "Test SARL" } })

    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(toast.success).toHaveBeenCalledWith("Prospect ajouté")
    })
  })
})
