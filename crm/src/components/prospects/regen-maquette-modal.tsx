// crm/src/components/prospects/regen-maquette-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface RegenMaquetteModalProps {
  prospectId: string;
  prospectNom: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (demoUrl: string | null) => void;
}

export function RegenMaquetteModal({
  prospectId,
  prospectNom,
  open,
  onClose,
  onSuccess,
}: RegenMaquetteModalProps) {
  const [prompt, setPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function fetchPrompt() {
    setPromptLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/prompt`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Impossible de charger le prompt");
        return;
      }
      setPrompt(data.prompt);
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setPromptLoading(false);
    }
  }

  // Fetch prompt each time the modal opens
  useEffect(() => {
    if (open) {
      fetchPrompt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prospectId]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/maquettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId, customPrompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la génération");
        return;
      }
      toast.success("Maquette regénérée !");
      onSuccess(data.demoUrl ?? null);
      onClose();
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && !generating) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!generating}>
        <DialogHeader>
          <DialogTitle>Regénérer — {prospectNom}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Modifications non sauvegardées — le prompt standard reste inchangé
          </p>
        </DialogHeader>

        {promptLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
              className="min-h-[220px] font-mono text-xs"
              placeholder="Prompt de génération..."
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchPrompt}
              disabled={generating || promptLoading}
            >
              <RefreshCw className="size-3.5" />
              Réinitialiser
            </Button>
          </div>
        )}

        {generating && (
          <p className="text-xs text-muted-foreground">
            Claude génère le HTML complet… jusqu&apos;à 60 secondes.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={generating}
          >
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || promptLoading || !prompt.trim()}
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Génération en cours (~30s)…
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Générer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
