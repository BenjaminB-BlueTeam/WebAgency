"use client"

interface Props {
  isLoading: boolean
  prompt: string
  onPromptChange: (value: string) => void
  onCancel: () => void
  onValidate: () => void
  error: string | null
}

export function PromptEditorModal({
  isLoading,
  prompt,
  onPromptChange,
  onCancel,
  onValidate,
  error,
}: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.80)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 6,
          width: "100%",
          maxWidth: 896,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 16,
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "48px 16px",
            }}
          >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div
              style={{
                width: 32,
                height: 32,
                border: "2px solid #1a1a1a",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ color: "#737373", fontSize: 14, margin: 0, textAlign: "center" }}>
              Investigation en cours... Analyse de l&apos;identité visuelle, scraping des données, enrichissement Pappers...
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: "#737373", fontSize: 12, margin: 0 }}>Prompt de génération</p>

            {error && (
              <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              style={{
                width: "100%",
                height: "min(70vh, calc(100vh - 240px))",
                background: "#000000",
                border: "1px solid #1a1a1a",
                borderRadius: 6,
                color: "#fafafa",
                fontFamily: "monospace",
                fontSize: 13,
                padding: "12px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={onCancel}
                style={{
                  background: "#0a0a0a",
                  color: "#737373",
                  border: "1px solid #1a1a1a",
                  borderRadius: 6,
                  padding: "10px 20px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={onValidate}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Valider et générer le site
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
