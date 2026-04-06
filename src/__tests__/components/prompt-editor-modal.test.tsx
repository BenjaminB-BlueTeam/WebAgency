// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { PromptEditorModal } from "@/components/prospects/prompt-editor-modal"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const baseProps = {
  isLoading: false,
  prompt: "Mon super prompt de test",
  onPromptChange: vi.fn(),
  onCancel: vi.fn(),
  onValidate: vi.fn(),
  error: null,
}

describe("PromptEditorModal", () => {
  it("shows spinner when isLoading=true", () => {
    const { container } = render(<PromptEditorModal {...baseProps} isLoading={true} />)
    // The spinner is a div with border-top-color white — check the loading text is present
    expect(screen.getByText(/Investigation en cours/)).toBeTruthy()
    // Textarea should NOT be rendered
    expect(container.querySelector("textarea")).toBeNull()
  })

  it("shows textarea with prompt when isLoading=false", () => {
    render(<PromptEditorModal {...baseProps} />)
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    expect(textarea.value).toBe("Mon super prompt de test")
  })

  it("calls onCancel when Annuler clicked", () => {
    const onCancel = vi.fn()
    render(<PromptEditorModal {...baseProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText("Annuler"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
