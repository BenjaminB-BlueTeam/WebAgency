// crm/src/components/prospects/prospect-row-expand.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Mail,
  Palette,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RegenMaquetteModal } from "@/components/prospects/regen-maquette-modal";
import { AnalysePanel } from "@/components/prospects/analyse-panel";
import { EmailPreviewPanel } from "@/components/prospects/email-preview-panel";
import { ResumeEchangesSection } from "@/components/prospects/resume-echanges-section";
import type { AnalyseResult } from "@/lib/prompts/analyse";

interface ProspectRowExpandProps {
  prospect: {
    id: string;
    nom: string;
    telephone?: string | null;
    email?: string | null;
    noteGoogle?: number | null;
    nbAvisGoogle?: number | null;
    siteUrl?: string | null;
    notes?: string | null;
    maquettes: { id: string; statut: string; demoUrl: string | null }[];
  };
  initialDemoUrl: string | null;
  onClose: () => void;
  onMaquetteUpdated: (demoUrl: string | null) => void;
}

export function ProspectRowExpand({
  prospect,
  initialDemoUrl,
  onMaquetteUpdated,
}: ProspectRowExpandProps) {
  const [demoUrl, setDemoUrl] = useState<string | null>(initialDemoUrl);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);

  // Read saved analysis from notes
  const savedAnalyse = (() => {
    if (!prospect.notes) return null;
    try {
      const n = JSON.parse(prospect.notes as string);
      return (n.analyse_concurrentielle as AnalyseResult) ?? null;
    } catch { return null; }
  })();

  const [analyse, setAnalyse] = useState<AnalyseResult | null>(savedAnalyse);
  const hasAnalyse = analyse !== null;

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

  function handleRegenSuccess(url: string | null) {
    setDemoUrl(url);
    if (url) onMaquetteUpdated(url);
  }

  return (
    <>
      <div className="border-t border-border/50 bg-muted/20 px-4 py-4">
        {/* Résumé échanges */}
        <div className="mb-3">
          <ResumeEchangesSection prospectId={prospect.id} />
        </div>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-[220px_1fr] gap-6">
          {/* Colonne gauche — infos + actions */}
          <div className="flex flex-col gap-4 border-r border-border/30 pr-6">
            {/* Contact */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Contact</p>
              <div className="flex flex-col gap-1">
                {prospect.telephone && (
                  <a href={`tel:${prospect.telephone}`} className="text-xs text-white/70 hover:text-white transition-colors">
                    📞 {prospect.telephone}
                  </a>
                )}
                {prospect.email && (
                  <span className="text-xs text-white/70 truncate">✉ {prospect.email}</span>
                )}
                {prospect.noteGoogle != null && (
                  <span className="text-xs text-yellow-400">
                    ⭐ {prospect.noteGoogle} · {prospect.nbAvisGoogle ?? 0} avis
                  </span>
                )}
                {prospect.siteUrl ? (
                  <a href={prospect.siteUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline truncate">
                    🌐 {prospect.siteUrl.replace(/^https?:\/\//, "").slice(0, 28)}
                  </a>
                ) : (
                  <span className="text-xs text-white/20 italic">Aucun site</span>
                )}
              </div>
            </div>

            {/* Démo maquette */}
            {demoUrl && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Démo</p>
                <a href={demoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 truncate max-w-[180px]">
                  <ExternalLink className="size-3 shrink-0" />
                  {demoUrl.replace(/^https?:\/\//, "").slice(0, 25)}
                </a>
              </div>
            )}

            {/* Actions */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Actions</p>
              <div className="flex flex-col gap-2">
                {/* Maquette */}
                {!demoUrl ? (
                  <Button variant="outline" size="sm"
                    onClick={handleGenerateMaquette}
                    disabled={generateLoading || !hasAnalyse}
                    title={!hasAnalyse ? "Lancez d'abord l'analyse concurrentielle" : undefined}
                  >
                    {generateLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Palette className="size-3.5" />}
                    {generateLoading ? "Génération…" : "Générer maquette"}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setRegenModalOpen(true)}>
                    <RefreshCw className="size-3.5" />
                    Regénérer maquette…
                  </Button>
                )}

                {/* Email */}
                <Button variant="outline" size="sm"
                  onClick={() => setShowEmailPanel(v => !v)}
                >
                  <Mail className="size-3.5" />
                  {showEmailPanel ? "Masquer email" : "Générer email ciblé"}
                </Button>

                {/* Fiche complète */}
                <Link href={`/prospects/${prospect.id}`}
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mt-1">
                  Fiche complète <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Colonne droite — analyse ou email */}
          <div className="min-w-0">
            {showEmailPanel ? (
              <EmailPreviewPanel
                prospectId={prospect.id}
                onClose={() => setShowEmailPanel(false)}
                onSent={() => {
                  setShowEmailPanel(false);
                  toast.success("Email envoyé !");
                }}
              />
            ) : (
              <AnalysePanel
                prospectId={prospect.id}
                initialAnalyse={analyse}
                onAnalyseDone={setAnalyse}
              />
            )}
          </div>
        </div>

        {/* iframe prévisualisation */}
        {demoUrl && (
          <div className="mt-4 border rounded overflow-hidden" style={{ height: "280px" }}>
            <iframe src={demoUrl} className="w-full h-full"
              title={`Prévisualisation ${prospect.nom}`}
              sandbox="allow-scripts allow-same-origin" loading="lazy" />
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
