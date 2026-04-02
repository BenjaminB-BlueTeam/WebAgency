"use client";

import { useState } from "react";
import { toast } from "sonner";

interface MaquetteValidateActionsProps {
  maquetteId: string;
  onValidated?: () => void;
}

export function MaquetteValidateActions({ maquetteId, onValidated }: MaquetteValidateActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleValider() {
    setLoading(true);
    try {
      const res = await fetch(`/api/maquettes/${maquetteId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "valider" }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Erreur validation");
        return;
      }
      toast.success("Maquette validée !");
      onValidated?.();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleCorriger() {
    if (!feedback.trim() || feedback.trim().length < 3) {
      toast.error("Décrivez les corrections nécessaires (min 3 chars)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/maquettes/${maquetteId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "corriger", feedback: feedback.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Erreur correction");
        return;
      }
      toast.success("Corrections demandées enregistrées");
      onValidated?.();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  if (showFeedback) {
    return (
      <div className="mt-3 flex flex-col gap-2" onClick={e => e.preventDefault()}>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Décrivez les corrections attendues…"
          className="w-full rounded border border-border bg-background/50 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none"
          rows={3}
          maxLength={500}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCorriger}
            disabled={loading}
            className="rounded bg-red-500/20 border border-red-500/30 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Envoyer corrections"}
          </button>
          <button
            type="button"
            onClick={() => setShowFeedback(false)}
            className="rounded px-2 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2" onClick={e => e.preventDefault()}>
      <button
        type="button"
        onClick={handleValider}
        disabled={loading}
        className="flex-1 rounded bg-green-500/20 border border-green-500/30 px-2 py-1.5 text-[10px] font-semibold text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
      >
        {loading ? "…" : "✓ Valider"}
      </button>
      <button
        type="button"
        onClick={() => setShowFeedback(true)}
        disabled={loading}
        className="flex-1 rounded bg-red-500/10 border border-red-500/20 px-2 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        ✗ Corrections
      </button>
    </div>
  );
}
