// crm/src/components/prospects/analyse-panel.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AnalyseResult } from "@/lib/prompts/analyse";

interface AnalysePanelProps {
  prospectId: string;
  initialAnalyse: AnalyseResult | null;
  onAnalyseDone?: (analyse: AnalyseResult) => void;
}

function Section({ title, color, children }: {
  title: string; color: string; children: React.ReactNode
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left bg-white/3 hover:bg-white/5 transition-colors"
      >
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>{title}</span>
        {open ? <ChevronDown className="size-3 text-white/30" /> : <ChevronRight className="size-3 text-white/30" />}
      </button>
      {open && <div className="px-3 pb-3 pt-2">{children}</div>}
    </div>
  );
}

export function AnalysePanel({ prospectId, initialAnalyse, onAnalyseDone }: AnalysePanelProps) {
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(initialAnalyse);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);

  async function runAnalyse() {
    setLoading(true);
    setSteps([]);
    setAnalyse(null);

    try {
      const res = await fetch(`/api/prospects/${prospectId}/analyse-stream`);
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.step) {
              setSteps(prev => [...prev, event.step]);
            }
            if (event.error) {
              toast.error(`Analyse échouée : ${event.error}`);
              setLoading(false);
              return;
            }
            if (event.done && event.rapport) {
              setAnalyse(event.rapport);
              onAnalyseDone?.(event.rapport);
              toast.success("Analyse concurrentielle terminée !");
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setLoading(false);
      setSteps([]);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 py-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-white/50">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
            {s}
          </div>
        ))}
        {steps.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Loader2 className="size-3 animate-spin" />
            Initialisation…
          </div>
        )}
      </div>
    );
  }

  if (!analyse) {
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <p className="text-xs text-white/30 italic">
          Lance l&apos;analyse pour voir le rapport concurrentiel et l&apos;argumentaire de vente…
        </p>
        <button
          type="button"
          onClick={runAnalyse}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
        >
          🔍 Analyser site + concurrents
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header with re-run */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-white/40">Rapport concurrentiel</span>
        <button
          type="button"
          onClick={runAnalyse}
          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
          title="Relancer l'analyse"
        >
          <RefreshCw className="size-2.5" /> Relancer
        </button>
      </div>

      {/* Audit site */}
      {analyse.audit_site && (
        <Section title={`Audit site — ${analyse.audit_site.note}/10`} color="text-orange-400">
          <p className="text-xs text-white/60 mb-2">{analyse.audit_site.resume}</p>
          <p className="text-[10px] text-white/30 mb-1">Stack : {analyse.audit_site.stack}</p>
          {analyse.audit_site.sections_manquantes.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] uppercase text-red-400/70 mb-1">Sections manquantes</p>
              <ul className="space-y-0.5">
                {analyse.audit_site.sections_manquantes.map((s, i) => (
                  <li key={i} className="text-xs text-red-300/80">• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* Benchmark */}
      {analyse.benchmark.length > 0 && (
        <Section title="Benchmark concurrents" color="text-blue-400">
          <div className="flex flex-col gap-3">
            {analyse.benchmark.map((c, i) => (
              <div key={i} className="border-l-2 border-white/10 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white/80">{c.nom}</span>
                  <span className="text-[10px] text-white/30">{c.note}/10</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    {c.points_forts.map((p, j) => (
                      <p key={j} className="text-[10px] text-emerald-400/80">✓ {p}</p>
                    ))}
                  </div>
                  <div>
                    {c.points_faibles.map((p, j) => (
                      <p key={j} className="text-[10px] text-red-400/80">✗ {p}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {analyse.opportunites_differenciation.length > 0 && (
            <div className="mt-2 bg-violet-500/10 rounded p-2">
              <p className="text-[10px] uppercase text-violet-400 mb-1">Opportunités</p>
              {analyse.opportunites_differenciation.map((o, i) => (
                <p key={i} className="text-xs text-violet-300">→ {o}</p>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* SEO */}
      <Section title="Analyse SEO locale" color="text-yellow-400">
        <p className="text-xs text-white/60 mb-2">{analyse.analyse_seo.google_business}</p>
        <p className="text-xs text-white/50 mb-2">{analyse.analyse_seo.comparaison_avis}</p>
        {analyse.analyse_seo.mots_cles_manquants.length > 0 && (
          <div>
            <p className="text-[10px] uppercase text-yellow-400/70 mb-1">Mots-clés manquants</p>
            <p className="text-xs text-white/40">{analyse.analyse_seo.mots_cles_manquants.join(", ")}</p>
          </div>
        )}
      </Section>

      {/* Argumentaire */}
      <Section title="Argumentaire de vente" color="text-emerald-400">
        <div className="flex flex-col gap-2">
          {analyse.argumentaire.arguments_chocs.map((a, i) => (
            <div key={i} className="bg-emerald-500/10 rounded px-2 py-1.5 border border-emerald-500/20">
              <p className="text-xs text-emerald-300">💬 {a}</p>
            </div>
          ))}
          <div className="mt-2">
            <p className="text-[10px] uppercase text-white/30 mb-1">Objections / Réponses</p>
            {analyse.argumentaire.reponses_objections.map((r, i) => (
              <div key={i} className="mb-1">
                <p className="text-[10px] text-red-400/70">— {r.objection}</p>
                <p className="text-[10px] text-emerald-400/70 ml-2">→ {r.reponse}</p>
              </div>
            ))}
          </div>
          <p className="text-xs font-medium text-white/70 mt-1">
            💰 Prix recommandé : {analyse.argumentaire.prix_recommande}
          </p>
        </div>
      </Section>
    </div>
  );
}
