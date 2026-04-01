// crm/src/components/prospects/prospect-row-expand.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Mail,
  Palette,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RegenMaquetteModal } from "@/components/prospects/regen-maquette-modal";

interface ProspectRowExpandProps {
  prospect: {
    id: string;
    nom: string;
    maquettes: { id: string; statut: string; demoUrl: string | null }[];
  };
  initialDemoUrl: string | null;
  onClose: () => void;
  onMaquetteUpdated: (demoUrl: string | null) => void;
}

interface EmailResult {
  sujet: string;
  corps: string;
}

interface AnalyseResult {
  manques_prospect: string[];
  avantages_prospect: string[];
  argumentaire_vente: string;
  prompt_maquette_enrichi: string;
}

export function ProspectRowExpand({
  prospect,
  initialDemoUrl,
  onMaquetteUpdated,
}: ProspectRowExpandProps) {
  const [demoUrl, setDemoUrl] = useState<string | null>(initialDemoUrl);
  const [email, setEmail] = useState<EmailResult | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"sujet" | "corps" | null>(null);
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [analyseExpanded, setAnalyseExpanded] = useState(false);

  const hasMaquette = demoUrl !== null || prospect.maquettes.length > 0;
  const analyseDisponible = analyse !== null;

  async function handleAnalyseConcurrence() {
    setAnalyseLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/analyse`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'analyse");
        return;
      }
      setAnalyse(data);
      setAnalyseExpanded(true);
      toast.success("Analyse concurrentielle terminée !");
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setAnalyseLoading(false);
    }
  }

  async function handleGenerateMaquette() {
    setGenerateLoading(true);
    try {
      const res = await fetch("/api/maquettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la génération");
        return;
      }
      const url = data.demoUrl ?? null;
      setDemoUrl(url);
      if (url) {
        onMaquetteUpdated(url);
        toast.success("Maquette générée !");
      } else {
        toast.success("Maquette générée (sans déploiement Netlify)");
      }
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setGenerateLoading(false);
    }
  }

  async function handleGenerateEmail() {
    setEmailLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/email`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la génération email");
        return;
      }
      setEmail({ sujet: data.sujet, corps: data.corps });
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setEmailLoading(false);
    }
  }

  async function copyToClipboard(text: string, field: "sujet" | "corps") {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleRegenSuccess(url: string | null) {
    setDemoUrl(url);
    if (url) onMaquetteUpdated(url);
  }

  return (
    <>
      <div className="flex flex-col gap-4 bg-muted/30 px-4 py-4 border-t border-border/50">
        <div className="flex flex-wrap items-start gap-4">
          {/* 1. Demo link / Générer maquette */}
          <div className="flex min-w-[180px] flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Démo
            </p>
            {demoUrl ? (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors truncate max-w-[220px]"
              >
                <ExternalLink className="size-3.5 shrink-0" />
                <span className="truncate">{demoUrl.replace(/^https?:\/\//, "")}</span>
              </a>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateMaquette}
                disabled={generateLoading || !analyseDisponible}
                title={!analyseDisponible ? "Lancez d'abord l'analyse concurrentielle" : undefined}
              >
                {generateLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Palette className="size-3.5" />
                )}
                {generateLoading ? "Génération..." : "Générer maquette"}
              </Button>
            )}
          </div>

          {/* 2. Analyse concurrentielle */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Analyse
            </p>
            {!analyse ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyseConcurrence}
                disabled={analyseLoading}
              >
                {analyseLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                {analyseLoading ? "Analyse en cours..." : "Analyser la concurrence"}
              </Button>
            ) : (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setAnalyseExpanded(!analyseExpanded)}
                  className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {analyseExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  {analyseExpanded ? "Masquer l'analyse" : "Voir l'analyse"}
                </button>
              </div>
            )}
          </div>

          {/* 3. Email */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </p>
            {!email ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateEmail}
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Mail className="size-3.5" />
                )}
                {emailLoading ? "Génération..." : "Générer email"}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-3 max-w-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Sujet
                    </p>
                    <p className="text-xs text-foreground">{email.sujet}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(email.sujet, "sujet")}
                    className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copier le sujet"
                  >
                    {copiedField === "sujet" ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-start justify-between gap-2 border-t border-border pt-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Corps
                    </p>
                    <p className="line-clamp-2 text-xs text-foreground/70">{email.corps}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(email.corps, "corps")}
                    className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copier le corps"
                  >
                    {copiedField === "corps" ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleGenerateEmail}
                  disabled={emailLoading}
                  className="self-start"
                >
                  {emailLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                  Regénérer
                </Button>
              </div>
            )}
          </div>

          {/* 4. Regénérer maquette (si existante) */}
          {hasMaquette && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Maquette
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRegenModalOpen(true)}
              >
                <RefreshCw className="size-3.5" />
                Regénérer…
              </Button>
            </div>
          )}

          {/* 5. Voir la fiche complète → aligné à droite */}
          <div className="ml-auto flex items-end">
            <Link
              href={`/prospects/${prospect.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voir la fiche complète
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Bloc résultat analyse concurrentielle */}
        {analyse && analyseExpanded && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-4">
            {/* Manques — rouge */}
            {analyse.manques_prospect.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Ce qui manque au prospect</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {analyse.manques_prospect.map((item, i) => (
                    <li key={i} className="text-xs text-red-300">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avantages — vert */}
            {analyse.avantages_prospect.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Points forts du prospect</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {analyse.avantages_prospect.map((item, i) => (
                    <li key={i} className="text-xs text-emerald-300">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Argumentaire — bleu */}
            {analyse.argumentaire_vente && (
              <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">Argumentaire de vente</p>
                <p className="text-xs text-blue-300 whitespace-pre-line">{analyse.argumentaire_vente}</p>
              </div>
            )}

            {/* Prompt maquette enrichi — gris */}
            {analyse.prompt_maquette_enrichi && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Prompt maquette enrichi</p>
                <p className="text-xs text-muted-foreground/70 whitespace-pre-line">{analyse.prompt_maquette_enrichi}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <RegenMaquetteModal
        prospectId={prospect.id}
        prospectNom={prospect.nom}
        open={regenModalOpen}
        onClose={() => setRegenModalOpen(false)}
        onSuccess={handleRegenSuccess}
      />
    </>
  );
}
