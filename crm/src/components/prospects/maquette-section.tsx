"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface MaquetteData {
  id: string;
  demoUrl: string | null;
  statut: string;
}

interface MaquetteSectionProps {
  prospectId: string;
  initialMaquette: MaquetteData | null;
}

export function MaquetteSection({ prospectId, initialMaquette }: MaquetteSectionProps) {
  const [maquette, setMaquette] = useState<MaquetteData | null>(initialMaquette);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/maquettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error ?? "Génération échouée");
        return;
      }
      const data = await res.json() as MaquetteData;
      setMaquette(data);
      toast.success(data.demoUrl ? "Maquette générée et déployée !" : "Maquette générée (sans déploiement)");
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maquette</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {maquette?.demoUrl && (
          <a
            href={maquette.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Voir la démo
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-60 disabled:cursor-wait transition-all"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading
            ? "Génération en cours (~30s)…"
            : maquette
            ? "🔄 Regénérer"
            : "🎨 Générer la maquette"}
        </button>
        {loading && (
          <p className="text-xs text-white/40">
            Claude génère le HTML complet… cela peut prendre jusqu&apos;à 60 secondes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
