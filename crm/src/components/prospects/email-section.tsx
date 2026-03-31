"use client";

import { useState } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface EmailSectionProps {
  prospectId: string;
}

export function EmailSection({ prospectId }: EmailSectionProps) {
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/email`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Génération email échouée");
        return;
      }
      const data = await res.json() as { sujet: string; corps: string };
      setSujet(data.sujet);
      setCorps(data.corps);
      toast.success("Email généré");
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copié`))
      .catch(() => toast.error("Impossible de copier"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email de prospection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sujet && !loading && (
          <button
            onClick={generate}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 transition-all"
          >
            ✉️ Générer l&apos;email
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération en cours…
          </div>
        )}

        {sujet && (
          <>
            {/* Subject */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">Objet</p>
                <button
                  onClick={() => copy(sujet, "Objet")}
                  className="flex items-center gap-1 text-[0.65rem] text-violet-400 hover:text-violet-300"
                >
                  <Copy className="w-3 h-3" /> Copier
                </button>
              </div>
              <p className="text-sm text-white bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                {sujet}
              </p>
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">Corps</p>
                <button
                  onClick={() => copy(corps, "Corps")}
                  className="flex items-center gap-1 text-[0.65rem] text-violet-400 hover:text-violet-300"
                >
                  <Copy className="w-3 h-3" /> Copier
                </button>
              </div>
              <pre className="text-xs text-white/80 bg-white/5 rounded-lg px-3 py-2 border border-white/10 whitespace-pre-wrap font-sans leading-relaxed">
                {corps}
              </pre>
            </div>

            {/* Regenerate */}
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Regénérer
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
