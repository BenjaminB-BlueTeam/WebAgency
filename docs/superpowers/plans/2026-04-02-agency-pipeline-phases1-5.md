# Agency Pipeline — Phases 1–5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le CRM en pipeline d'agence complet : prospection par tableau avec sélection, analyse concurrentielle SSE deep-marketing, génération maquette avec GitHub + versioning, email avec validation avant envoi, et pipeline statuts automatiques.

**Architecture:** 5 phases séquentielles. Phase 1 = UI prospection (tableau + bulk add). Phase 2 = expand prospect 2 colonnes + SSE analyse. Phase 3 = maquette pipeline avec GitHub + max 3 versions. Phase 4 = email preview/send + réponses. Phase 5 = avancerPipeline helper câblé partout.

**Tech Stack:** Next.js App Router, TypeScript, Prisma + libsql, Tailwind, SSE (ReadableStream), Himalaya (déjà câblé), GitHub REST API (fetch direct), Firecrawl (via scrapeUrl), Google Places (via lib/places.ts), Vitest

---

## File Map

### Phase 1
- Create: `crm/src/components/prospection/results-table.tsx`
- Modify: `crm/src/components/prospection/prospection-results-panel.tsx`

### Phase 2
- Create: `crm/src/lib/scrape.ts`
- Create: `crm/src/lib/prompts/analyse.ts`
- Create: `crm/src/app/api/prospects/[id]/analyse-stream/route.ts`
- Create: `crm/src/components/prospects/analyse-panel.tsx`
- Modify: `crm/src/components/prospects/prospect-row-expand.tsx`
- Modify: `crm/src/app/api/prospects/[id]/prompt/route.ts`

### Phase 3
- Modify: `crm/prisma/schema.prisma` (Maquette: +githubUrl, +version, +promptUsed)
- Create: `crm/src/lib/github.ts`
- Modify: `crm/src/app/api/maquettes/generate/route.ts`
- Create: `crm/src/app/api/maquettes/[id]/validate/route.ts`
- Modify: `crm/src/app/(dashboard)/maquettes/maquettes-page-client.tsx`
- Modify: `crm/src/components/layout/sidebar.tsx`

### Phase 4
- Create: `crm/src/components/prospects/email-preview-panel.tsx`
- Modify: `crm/src/components/prospects/prospect-row-expand.tsx`
- Create: `crm/src/app/api/prospects/[id]/resume/route.ts`
- Modify: `crm/src/components/prospects/resume-echanges-section.tsx`

### Phase 5
- Create: `crm/src/lib/pipeline.ts`
- Modify: `crm/src/app/api/prospects/[id]/email/route.ts` (wire pipeline)
- Modify: `crm/src/app/api/devis/route.ts` (wire pipeline)
- Modify: `crm/src/app/api/devis/[id]/route.ts` (wire pipeline)
- Modify: `crm/src/app/api/maquettes/[id]/validate/route.ts` (wire pipeline)
- Create: `tests/pipeline.test.ts`

---

## ═══ PHASE 1 — Prospection : tableau + bulk add ═══

### Task 1 — Composant `ResultsTable`

**Files:**
- Create: `crm/src/components/prospection/results-table.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// crm/src/components/prospection/results-table.tsx
"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface ResultsTableProps {
  prospects: SearchProspect[];
}

export function ResultsTable({ prospects }: ResultsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(
    new Set(prospects.filter(p => p.alreadyInCrm).map(p => `${p.nom}|${p.ville}`))
  );

  const key = (p: SearchProspect) => `${p.nom}|${p.ville}`;

  function toggleOne(k: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  function selectAllHaute() {
    const hautes = prospects
      .filter(p => p.priorite === "HAUTE" && !addedIds.has(key(p)))
      .map(key);
    setSelected(new Set(hautes));
  }

  const eligibles = useMemo(
    () => prospects.filter(p => !addedIds.has(key(p))),
    [prospects, addedIds]
  );

  const caPotentiel = selected.size * 690;

  async function handleBulkAdd() {
    if (selected.size === 0 || adding) return;
    setAdding(true);
    let added = 0;
    let skipped = 0;
    const toAdd = prospects.filter(p => selected.has(key(p)));

    // Batch by 3
    for (let i = 0; i < toAdd.length; i += 3) {
      const batch = toAdd.slice(i, i + 3);
      await Promise.all(
        batch.map(async p => {
          const res = await fetch("/api/prospects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nom: p.nom, activite: p.activite, ville: p.ville,
              telephone: p.telephone, email: p.email, siteUrl: p.siteUrl,
              adresse: p.adresse, noteGoogle: p.noteGoogle,
              statut: p.statut, priorite: p.priorite,
              raison: p.raison, argumentCommercial: p.argumentCommercial,
              source: "PROSPECTION",
            }),
          });
          if (res.ok) {
            added++;
            setAddedIds(prev => new Set([...prev, key(p)]));
          } else if (res.status === 409) {
            skipped++;
          }
        })
      );
    }

    setSelected(new Set());
    setAdding(false);
    const parts: string[] = [];
    if (added > 0) parts.push(`${added} ajouté${added > 1 ? "s" : ""}`);
    if (skipped > 0) parts.push(`${skipped} déjà existant${skipped > 1 ? "s" : ""} ignoré${skipped > 1 ? "s" : ""}`);
    toast.success(parts.join(" · "));
  }

  if (prospects.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={selectAllHaute}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Tout sélectionner HAUTE
          </button>
          {selected.size > 0 && (
            <span className="text-xs text-white/40">
              {selected.size} sélectionné{selected.size > 1 ? "s" : ""} · CA potentiel ~{caPotentiel.toLocaleString("fr-FR")} €
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleBulkAdd}
          disabled={selected.size === 0 || adding}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {adding ? "Ajout en cours…" : `Ajouter au CRM (${selected.size})`}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-white/40 uppercase tracking-[0.08em]">
              <th className="w-8 p-3 text-left"></th>
              <th className="p-3 text-left">Prospect</th>
              <th className="p-3 text-center">Score</th>
              <th className="p-3 text-center">Statut web</th>
              <th className="p-3 text-center">Google</th>
              <th className="p-3 text-left">Téléphone</th>
              <th className="p-3 text-left">Site</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p, i) => {
              const k = key(p);
              const isAdded = addedIds.has(k);
              const isSelected = selected.has(k);
              const scoreColor =
                p.score >= 60 ? "text-green-400" :
                p.score >= 30 ? "text-yellow-400" : "text-white/30";
              return (
                <tr
                  key={k}
                  className={`border-b border-border/20 transition-colors last:border-0 ${
                    isSelected ? "bg-violet-500/10" : i % 2 === 0 ? "bg-black/10" : ""
                  } ${isAdded ? "opacity-50" : "hover:bg-white/5"}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isAdded}
                      onChange={() => toggleOne(k)}
                      className="accent-violet-500 cursor-pointer"
                      aria-label={`Sélectionner ${p.nom}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-white/90">{p.nom}</div>
                    <div className="text-white/40">{p.activite} · {p.ville}</div>
                    {isAdded && <span className="text-[10px] text-green-400">✓ Dans le CRM</span>}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${scoreColor}`}>{p.score ?? "—"}</span>
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge type="statut" value={p.statut} />
                  </td>
                  <td className="p-3 text-center text-white/60">
                    {p.noteGoogle != null ? `⭐ ${p.noteGoogle}` : "—"}
                    {p.nbAvisGoogle != null ? ` (${p.nbAvisGoogle})` : ""}
                  </td>
                  <td className="p-3 text-white/60">{p.telephone ?? "—"}</td>
                  <td className="p-3">
                    {p.siteUrl ? (
                      <a
                        href={p.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:underline truncate block max-w-[120px]"
                      >
                        {p.siteUrl.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier que `SearchProspect` a un champ `score`**

Lire `crm/src/app/api/prospection/search/route.ts`. Si `score` n'est pas dans le type, l'ajouter :

```typescript
// Dans l'interface SearchProspect, ajouter :
score?: number;
```

Et dans la route, lors du mapping des résultats, calculer :
```typescript
import { calculerScore } from "@/lib/scoring";
// ...
score: calculerScore({ statut, noteGoogle, nbAvisGoogle, siteUrl }).score,
```

- [ ] **Step 3 : Commit**

```bash
cd crm && git add src/components/prospection/results-table.tsx
git commit -m "feat(prospection): ResultsTable — tableau checkbox + bulk add"
```

---

### Task 2 — Connecter `ResultsTable` à `ProspectionResultsPanel`

**Files:**
- Modify: `crm/src/components/prospection/prospection-results-panel.tsx`

- [ ] **Step 1 : Remplacer les cards par `ResultsTable`**

Dans `prospection-results-panel.tsx`, remplacer le bloc `<div className="flex flex-col gap-3">` qui rend les `SearchResultCard` par :

```tsx
import { ResultsTable } from "./results-table";

// Remplacer :
// <div className="flex flex-col gap-3">
//   {results.map((prospect, i) => (
//     <SearchResultCard ... />
//   ))}
// </div>

// Par :
<ResultsTable prospects={results} />
```

Supprimer l'import `SearchResultCard` s'il n'est plus utilisé.

Supprimer le lien "Voir dans Prospects →" de l'en-tête (le bulk add le remplace fonctionnellement).

- [ ] **Step 2 : Tester manuellement**

```bash
cd crm && npm run dev
```

Aller sur `http://localhost:3000/prospection`, lancer une recherche, vérifier :
- [ ] Les résultats s'affichent en tableau
- [ ] Les checkboxes fonctionnent
- [ ] "Tout sélectionner HAUTE" coche les bons
- [ ] Le bouton "Ajouter au CRM" est disabled quand rien de coché
- [ ] L'ajout fonctionne et affiche le toast

- [ ] **Step 3 : Commit**

```bash
git add src/components/prospection/prospection-results-panel.tsx
git commit -m "feat(prospection): remplace cards par ResultsTable"
```

---

## ═══ PHASE 2 — Expand panel 2 colonnes + Analyse SSE ═══

### Task 3 — Helper `scrapeUrl`

**Files:**
- Create: `crm/src/lib/scrape.ts`

- [ ] **Step 1 : Créer le helper**

```typescript
// crm/src/lib/scrape.ts

/**
 * Scrape une URL et retourne son contenu en Markdown.
 * Primaire : Firecrawl. Fallback : fetch() + extraction texte brut.
 */
export async function scrapeUrl(url: string): Promise<string> {
  const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;

  if (FIRECRAWL_KEY) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${FIRECRAWL_KEY}`,
        },
        body: JSON.stringify({ url, formats: ["markdown"] }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json() as { success: boolean; data?: { markdown?: string } };
        if (data.success && data.data?.markdown) {
          return data.data.markdown.slice(0, 8000); // cap tokens
        }
      }
    } catch {
      // fallthrough to fetch
    }
  }

  // Fallback fetch
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WebAgencyCRM/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags, keep text
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch {
    return "";
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/lib/scrape.ts
git commit -m "feat(lib): scrapeUrl — Firecrawl + fetch fallback"
```

---

### Task 4 — Prompt analyse marketing expert

**Files:**
- Create: `crm/src/lib/prompts/analyse.ts`

- [ ] **Step 1 : Créer le prompt**

```typescript
// crm/src/lib/prompts/analyse.ts

export interface AnalyseInput {
  prospect: {
    nom: string;
    activite: string;
    ville: string;
    statut: string;
    noteGoogle?: number | null;
    nbAvisGoogle?: number | null;
    siteUrl?: string | null;
    siteContent?: string; // scraped markdown
  };
  concurrents: Array<{
    nom: string;
    url?: string;
    noteGoogle?: number;
    nbAvis?: number;
    siteContent?: string;
  }>;
}

export interface AnalyseResult {
  audit_site: {
    note: number;
    stack: string;
    sections_manquantes: string[];
    signaux_conversion_absents: string[];
    resume: string;
  } | null;
  benchmark: Array<{
    nom: string;
    url: string;
    note: number;
    points_forts: string[];
    points_faibles: string[];
  }>;
  standard_secteur: string[];
  opportunites_differenciation: string[];
  analyse_seo: {
    google_business: string;
    mots_cles_manquants: string[];
    comparaison_avis: string;
  };
  argumentaire: {
    arguments_chocs: string[];
    reponses_objections: Array<{ objection: string; reponse: string }>;
    prix_recommande: string;
  };
  prompt_maquette_enrichi: string;
}

export function getAnalysePrompt(input: AnalyseInput): string {
  const { prospect, concurrents } = input;

  const concurrentsText = concurrents.map(c => `
--- CONCURRENT : ${c.nom} ---
URL : ${c.url ?? "inconnue"}
Note Google : ${c.noteGoogle ?? "N/A"} (${c.nbAvis ?? 0} avis)
Contenu site :
${c.siteContent ? c.siteContent.slice(0, 2000) : "Site non scrappé ou inexistant"}
`).join("\n");

  return `Tu es un expert marketing digital avec 20 ans d'expérience, spécialisé dans les TPE et artisans locaux français. Tu maîtrises les méthodes actuelles : SEO local, Google Business Profile, design mobile-first, Core Web Vitals, copywriting de conversion.

PROSPECT À ANALYSER :
Nom : ${prospect.nom}
Activité : ${prospect.activite}
Ville : ${prospect.ville}
Statut web : ${prospect.statut}
Note Google : ${prospect.noteGoogle ?? "N/A"} (${prospect.nbAvisGoogle ?? 0} avis)
${prospect.siteUrl ? `URL site actuel : ${prospect.siteUrl}` : "SANS SITE"}

${prospect.siteContent ? `CONTENU DU SITE ACTUEL :
${prospect.siteContent.slice(0, 3000)}` : ""}

CONCURRENTS IDENTIFIÉS :
${concurrentsText}

Effectue une analyse marketing APPROFONDIE. Pour chaque point, cite des éléments concrets tirés du contenu scrappé.

Analyse les dimensions suivantes :
1. Design et modernité (animations, mobile-first, typographie, hiérarchie visuelle)
2. SEO local (balises title/meta, structured data Local Business, cohérence NAP, mots-clés métier + ville)
3. Avis Google (volume, note, réponses du propriétaire, récence)
4. Conversion (CTA above the fold, formulaire de contact, téléphone cliquable, gallery/réalisations)
5. Contenu (présence des services, horaires, zone géographique, témoignages)
6. Différenciation (ce que personne dans le secteur ne fait encore)

Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires :
{
  "audit_site": ${prospect.siteUrl ? `{
    "note": <0-10>,
    "stack": "<WordPress X.Y / Wix / HTML5 / etc.>",
    "sections_manquantes": ["..."],
    "signaux_conversion_absents": ["..."],
    "resume": "<2-3 phrases percutantes sur les problèmes principaux>"
  }` : "null"},
  "benchmark": [
    {
      "nom": "...",
      "url": "...",
      "note": <0-10>,
      "points_forts": ["...", "..."],
      "points_faibles": ["...", "..."]
    }
  ],
  "standard_secteur": ["<ce que tous les bons sites du secteur ont>"],
  "opportunites_differenciation": ["<ce qu'aucun concurrent local ne fait encore>"],
  "analyse_seo": {
    "google_business": "<état du profil GBP>",
    "mots_cles_manquants": ["..."],
    "comparaison_avis": "<analyse comparative chiffrée>"
  },
  "argumentaire": {
    "arguments_chocs": ["<argument 1 ultra-spécifique>", "<argument 2>", "<argument 3>"],
    "reponses_objections": [
      {"objection": "...", "reponse": "..."},
      {"objection": "...", "reponse": "..."},
      {"objection": "...", "reponse": "..."}
    ],
    "prix_recommande": "<fourchette ou montant avec justification>"
  },
  "prompt_maquette_enrichi": "<instructions précises pour Claude pour générer la maquette en corrigeant les lacunes identifiées, mentionnant les opportunités de différenciation, avec les services exacts et le ton adapté à l'activité>"
}`;
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/lib/prompts/analyse.ts
git commit -m "feat(prompts): getAnalysePrompt — expert marketing 20 ans, 6 dimensions"
```

---

### Task 5 — Route SSE `analyse-stream`

**Files:**
- Create: `crm/src/app/api/prospects/[id]/analyse-stream/route.ts`

- [ ] **Step 1 : Créer la route**

```typescript
// crm/src/app/api/prospects/[id]/analyse-stream/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { anthropic } from "@/lib/anthropic";
import { scrapeUrl } from "@/lib/scrape";
import { placesTextSearch, placesDetails } from "@/lib/places";
import { getAnalysePrompt, type AnalyseResult } from "@/lib/prompts/analyse";

export const maxDuration = 300;

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { id } = await params;
  if (!id || id.length > 100) {
    return new Response("id invalide", { status: 400 });
  }

  const prospect = await db.prospect.findUnique({ where: { id } });
  if (!prospect) return new Response("Not found", { status: 404 });

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(new TextEncoder().encode(sseEvent(data)));
      }

      try {
        // Step 1: scrape prospect site
        let siteContent = "";
        if (prospect.siteUrl) {
          send({ step: "Scraping du site prospect…", done: false });
          siteContent = await scrapeUrl(prospect.siteUrl);
        }

        // Step 2: find competitors via Google Places
        send({ step: "Recherche des concurrents…", done: false });
        const query = `${prospect.activite} ${prospect.ville}`;
        const places = await placesTextSearch(query);

        // Filter: exclude the prospect itself, take top 3 with websites
        const competitorPlaces = places
          .filter(p => p.name.toLowerCase() !== prospect.nom.toLowerCase())
          .slice(0, 5);

        // Step 3: scrape competitor sites
        send({ step: "Analyse des sites concurrents…", done: false });
        const concurrents = await Promise.all(
          competitorPlaces.slice(0, 3).map(async p => {
            const details = await placesDetails(p.place_id);
            let siteContent = "";
            if (details?.website) {
              siteContent = await scrapeUrl(details.website);
            }
            return {
              nom: p.name,
              url: details?.website ?? "",
              noteGoogle: details?.rating ?? p.rating,
              nbAvis: undefined as number | undefined,
              siteContent,
            };
          })
        );

        // Step 4: Claude analysis
        send({ step: "Analyse marketing en cours…", done: false });
        const prompt = getAnalysePrompt({
          prospect: {
            nom: prospect.nom,
            activite: prospect.activite,
            ville: prospect.ville,
            statut: prospect.statut,
            noteGoogle: prospect.noteGoogle,
            nbAvisGoogle: prospect.nbAvisGoogle,
            siteUrl: prospect.siteUrl,
            siteContent,
          },
          concurrents,
        });

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        });

        const raw = response.content.find(b => b.type === "text")?.text ?? "{}";
        let rapport: AnalyseResult;
        try {
          rapport = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
        } catch {
          send({ error: "Parse JSON échoué", raw: raw.slice(0, 500), done: true });
          controller.close();
          return;
        }

        // Persist in DB
        const existingNotes = prospect.notes
          ? (() => { try { return JSON.parse(prospect.notes as string); } catch { return {}; } })()
          : {};

        await db.prospect.update({
          where: { id },
          data: {
            notes: JSON.stringify({
              ...existingNotes,
              analyse_concurrentielle: rapport,
              analyse_date: new Date().toISOString(),
            }),
          },
        });

        await db.activite.create({
          data: {
            prospectId: id,
            type: "ANALYSE",
            description: "Analyse concurrentielle approfondie (SSE)",
          },
        });

        send({ rapport, done: true });
      } catch (err) {
        send({ error: String(err), done: true });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/api/prospects/[id]/analyse-stream/
git commit -m "feat(api): analyse-stream — SSE Firecrawl + Places + Claude deep marketing"
```

---

### Task 6 — Composant `AnalysePanel`

**Files:**
- Create: `crm/src/components/prospects/analyse-panel.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
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
```

- [ ] **Step 2 : Commit**

```bash
git add src/components/prospects/analyse-panel.tsx
git commit -m "feat(components): AnalysePanel — SSE streaming + 4 sections dépliables"
```

---

### Task 7 — Refonte `ProspectRowExpand` en 2 colonnes

**Files:**
- Modify: `crm/src/components/prospects/prospect-row-expand.tsx`

**Prérequis :** vérifier quelle forme de données est passée via `prospect` prop dans `ProspectsList`. Il faut que `telephone`, `email`, `noteGoogle`, `nbAvisGoogle`, `siteUrl` soient disponibles dans la prop. Si pas le cas, ajouter dans la query Prisma du parent.

- [ ] **Step 1 : Étendre l'interface de la prop `prospect`**

Modifier l'interface `ProspectRowExpandProps` :

```typescript
interface ProspectRowExpandProps {
  prospect: {
    id: string;
    nom: string;
    telephone?: string | null;
    email?: string | null;
    noteGoogle?: number | null;
    nbAvisGoogle?: number | null;
    siteUrl?: string | null;
    notes?: string | null; // pour lire analyse_concurrentielle
    maquettes: { id: string; statut: string; demoUrl: string | null; version?: number | null }[];
  };
  initialDemoUrl: string | null;
  onClose: () => void;
  onMaquetteUpdated: (demoUrl: string | null) => void;
}
```

- [ ] **Step 2 : Remplacer le JSX par le layout 2 colonnes**

Remplacer tout le JSX retourné (le `<div className="flex flex-col gap-4 ...">`) par :

```tsx
// Lire l'analyse depuis notes
const savedAnalyse = (() => {
  if (!prospect.notes) return null;
  try {
    const n = JSON.parse(prospect.notes as string);
    return n.analyse_concurrentielle ?? null;
  } catch { return null; }
})();

// Dans le composant :
const [analyse, setAnalyse] = useState<AnalyseResult | null>(savedAnalyse);
const hasAnalyse = analyse !== null;

// JSX :
return (
  <>
    <div className="border-t border-border/50 bg-muted/20 px-4 py-4">
      {/* Résumé échanges — si données disponibles */}
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
```

Ajouter `import { AnalysePanel } from "./analyse-panel"`, `import { EmailPreviewPanel } from "./email-preview-panel"`, `import { ResumeEchangesSection } from "./resume-echanges-section"` en haut du fichier.

Ajouter `const [showEmailPanel, setShowEmailPanel] = useState(false)` dans les states.

- [ ] **Step 3 : Vérifier que la ProspectsList passe les bons champs**

Dans `crm/src/components/prospects/prospects-list.tsx` (ou le parent), vérifier que la query inclut : `telephone, email, noteGoogle, nbAvisGoogle, siteUrl, notes`.

Si un champ manque dans le select Prisma de la route `/api/prospects`, l'ajouter.

- [ ] **Step 4 : Tester**

```bash
npm run dev
```

Ouvrir `/prospects`, expand une ligne, vérifier :
- [ ] Infos contact affichées à gauche
- [ ] `AnalysePanel` vide affiché à droite avec bouton "Analyser"
- [ ] Bouton "Générer maquette" grisé tant qu'analyse absente
- [ ] Clic "Analyser" → progression SSE → rapport affiché

- [ ] **Step 5 : Commit**

```bash
git add src/components/prospects/prospect-row-expand.tsx
git commit -m "feat(expand): layout 2 colonnes — contact + AnalysePanel + EmailPreviewPanel"
```

---

### Task 8 — Enrichir le prompt maquette avec l'analyse

**Files:**
- Modify: `crm/src/app/api/prospects/[id]/prompt/route.ts`

- [ ] **Step 1 : Injecter le rapport dans le prompt retourné**

```typescript
// Dans la route GET /api/prospects/[id]/prompt
const prospect = await db.prospect.findUnique({
  where: { id },
  select: {
    id: true, nom: true, activite: true, ville: true,
    telephone: true, email: true, siteUrl: true, statut: true,
    argumentCommercial: true, notes: true, // ajouter notes
  },
});

// Après le prompt de base :
const d = getDesignDirection(prospect.activite);
let prompt = getUserPrompt(prospect, d);

// Enrichissement analyse
if (prospect.notes) {
  try {
    const notes = JSON.parse(prospect.notes as string);
    const analyse = notes.analyse_concurrentielle;
    if (analyse?.prompt_maquette_enrichi) {
      prompt += `\n\n--- ANALYSE CONCURRENTIELLE ---\n${analyse.prompt_maquette_enrichi}`;
    }
    if (analyse?.argumentaire?.arguments_chocs?.length) {
      prompt += `\n\nARGUMENTS DIFFÉRENCIANTS : ${analyse.argumentaire.arguments_chocs.join(" | ")}`;
    }
    if (analyse?.opportunites_differenciation?.length) {
      prompt += `\n\nOPPORTUNITÉS : ${analyse.opportunites_differenciation.join(", ")}`;
    }
    // Injection feedback prospect si regen
    if (notes.dernier_feedback_prospect) {
      prompt += `\n\n--- RETOURS DU PROSPECT ---\n${notes.dernier_feedback_prospect}\nAdapte la maquette en tenant compte de ces retours spécifiques.`;
    }
  } catch { /* ignore */ }
}

return NextResponse.json({ prompt });
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/api/prospects/[id]/prompt/route.ts
git commit -m "feat(prompt): injection analyse concurrentielle + feedback prospect"
```

---

## ═══ PHASE 3 — Maquette pipeline : GitHub + versioning ═══

### Task 9 — Migration Prisma (Maquette)

**Files:**
- Modify: `crm/prisma/schema.prisma`

- [ ] **Step 1 : Ajouter les champs à `Maquette`**

```prisma
model Maquette {
  id                String   @id @default(cuid())
  prospectId        String
  prospect          Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  type              String   @default("html")
  htmlPath          String?
  html              String?
  demoUrl           String?
  propositionUrl    String?
  netlifySiteId     String?
  netlifyPropSiteId String?
  statut            String   @default("BROUILLON")
  dateCreation      DateTime @default(now())
  dateEnvoi         DateTime?
  dateValidation    DateTime?
  retourClient      String?

  // Nouveau
  githubUrl         String?
  version           Int      @default(1)
  promptUsed        String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

- [ ] **Step 2 : Créer et appliquer la migration**

```bash
cd crm
npx prisma migrate dev --name add-maquette-versioning
```

Pour Turso (prod) :
```bash
npm run migrate-turso
```

- [ ] **Step 3 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): Maquette +githubUrl +version +promptUsed"
```

---

### Task 10 — Helper GitHub

**Files:**
- Create: `crm/src/lib/github.ts`

- [ ] **Step 1 : Créer le helper**

```typescript
// crm/src/lib/github.ts

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG ?? process.env.GITHUB_USERNAME;

const BASE = "https://api.github.com";

function headers() {
  return {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export interface CreatedRepo {
  htmlUrl: string;
  repoName: string;
}

/**
 * Crée un repo GitHub privé et push le HTML généré sur main.
 * Repo name : maquette-{prospect-slug}-v{version}
 */
export async function createMaquetteRepo(
  prospectNom: string,
  prospectVille: string,
  html: string,
  version: number
): Promise<CreatedRepo> {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN manquant");
  if (!GITHUB_ORG) throw new Error("GITHUB_ORG ou GITHUB_USERNAME manquant");

  const repoName = `maquette-${slugify(prospectNom)}-${slugify(prospectVille)}-v${version}`;

  // 1. Créer le repo privé
  const createRes = await fetch(`${BASE}/user/repos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: repoName,
      private: true,
      auto_init: false,
      description: `Maquette v${version} — ${prospectNom} (${prospectVille})`,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`GitHub create repo failed: ${createRes.status} — ${err}`);
  }

  const repo = await createRes.json() as { html_url: string; full_name: string };

  // 2. Push index.html sur main
  const content = Buffer.from(html).toString("base64");
  const pushRes = await fetch(
    `${BASE}/repos/${repo.full_name}/contents/index.html`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({
        message: `feat: maquette v${version} — ${prospectNom}`,
        content,
        branch: "main",
      }),
    }
  );

  if (!pushRes.ok) {
    const err = await pushRes.text();
    throw new Error(`GitHub push failed: ${pushRes.status} — ${err}`);
  }

  return { htmlUrl: repo.html_url, repoName };
}
```

- [ ] **Step 2 : Ajouter les variables dans `.env.local`**

```
GITHUB_TOKEN=ghp_xxxx
GITHUB_USERNAME=BenjaminB-BlueTeam
```

- [ ] **Step 3 : Commit**

```bash
git add src/lib/github.ts
git commit -m "feat(lib): github — createMaquetteRepo (private repo + push HTML)"
```

---

### Task 11 — Mise à jour `maquettes/generate` route

**Files:**
- Modify: `crm/src/app/api/maquettes/generate/route.ts`

- [ ] **Step 1 : Remplacer l'upsert par un create avec vérification max 3**

Modifier la section "Save to DB" :

```typescript
// Vérifier max 3 maquettes
const count = await db.maquette.count({ where: { prospectId } });
if (count >= 3) {
  return NextResponse.json(
    { error: "Maximum 3 maquettes atteint pour ce prospect. Supprimez-en une." },
    { status: 422 }
  );
}

const version = count + 1;

// GitHub (non-bloquant si token absent)
let githubUrl: string | null = null;
if (process.env.GITHUB_TOKEN) {
  try {
    const { htmlUrl } = await createMaquetteRepo(
      prospect.nom,
      prospect.ville,
      html,
      version
    );
    githubUrl = htmlUrl;
  } catch (err) {
    console.error("[maquettes/generate] GitHub failed:", err);
    // Continue — Netlify deploy is more important
  }
}

// Save to DB — CREATE (not upsert)
const maquette = await db.maquette.create({
  data: {
    prospectId,
    type: "html",
    html,
    demoUrl,
    netlifySiteId,
    githubUrl,
    version,
    promptUsed: user.slice(0, 5000), // cap
    statut: demoUrl ? "ATTENTE_VALIDATION" : "BROUILLON",
  },
});
```

Ajouter en haut du fichier :
```typescript
import { createMaquetteRepo } from "@/lib/github";
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/api/maquettes/generate/route.ts
git commit -m "feat(maquettes): versioning max 3 + GitHub repo + statut ATTENTE_VALIDATION"
```

---

### Task 12 — Route validation maquette

**Files:**
- Create: `crm/src/app/api/maquettes/[id]/validate/route.ts`

- [ ] **Step 1 : Créer la route**

```typescript
// crm/src/app/api/maquettes/[id]/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    action?: "valider" | "corriger";
    feedback?: string;
  };

  const { action, feedback } = body;
  if (!action || !["valider", "corriger"].includes(action)) {
    return NextResponse.json({ error: "action requise : valider | corriger" }, { status: 400 });
  }

  const maquette = await db.maquette.findUnique({
    where: { id },
    select: { id: true, prospectId: true, statut: true },
  });
  if (!maquette) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "valider") {
    await db.maquette.update({
      where: { id },
      data: { statut: "VALIDEE", dateValidation: new Date() },
    });
    await db.activite.create({
      data: {
        prospectId: maquette.prospectId,
        type: "NOTE",
        description: "Maquette validée",
      },
    });
    return NextResponse.json({ statut: "VALIDEE" });
  }

  // corriger
  if (!feedback || feedback.trim().length < 3) {
    return NextResponse.json({ error: "feedback requis" }, { status: 400 });
  }

  await db.maquette.update({
    where: { id },
    data: { statut: "A_CORRIGER", retourClient: feedback.trim() },
  });

  // Stocker le feedback dans les notes du prospect pour injection dans le prochain prompt
  const prospect = await db.prospect.findUnique({
    where: { id: maquette.prospectId },
    select: { notes: true },
  });
  const notes = prospect?.notes
    ? (() => { try { return JSON.parse(prospect.notes as string); } catch { return {}; } })()
    : {};
  await db.prospect.update({
    where: { id: maquette.prospectId },
    data: { notes: JSON.stringify({ ...notes, dernier_feedback_prospect: feedback.trim() }) },
  });

  await db.activite.create({
    data: {
      prospectId: maquette.prospectId,
      type: "NOTE",
      description: `Maquette refusée — corrections demandées : ${feedback.trim().slice(0, 100)}`,
    },
  });

  return NextResponse.json({ statut: "A_CORRIGER" });
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/api/maquettes/[id]/validate/
git commit -m "feat(api): maquettes/validate — valider | corriger + feedback → notes prospect"
```

---

### Task 13 — UI validation dans la page Maquettes

**Files:**
- Modify: `crm/src/app/(dashboard)/maquettes/maquettes-page-client.tsx`

- [ ] **Step 1 : Lire le fichier existant et ajouter colonne statut + boutons validation**

Lire d'abord `crm/src/app/(dashboard)/maquettes/maquettes-page-client.tsx` pour voir la structure exacte.

Ajouter dans le tableau des maquettes :
- Colonne "Statut validation" avec badge coloré selon `maquette.statut` :
  - `ATTENTE_VALIDATION` → amber "En attente"
  - `VALIDEE` → green "Validée"
  - `A_CORRIGER` → red "À corriger"
  - `BROUILLON` → gray "Brouillon"

- Boutons pour `ATTENTE_VALIDATION` :
  - `✓ Valider` → appelle `POST /api/maquettes/{id}/validate` avec `{ action: "valider" }`
  - `✗ Corrections` → ouvre un textarea inline, puis `POST` avec `{ action: "corriger", feedback: "..." }`

- Lien GitHub si `maquette.githubUrl` présent : `[GitHub ↗]`

- [ ] **Step 2 : Ajouter le compteur de badge dans la sidebar**

Dans `crm/src/components/layout/sidebar.tsx` (lire d'abord le fichier), ajouter un badge sur le lien Maquettes :

```typescript
// Dans le composant sidebar, fetch le count :
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  fetch("/api/maquettes?statut=ATTENTE_VALIDATION&count=1")
    .then(r => r.json())
    .then(d => setPendingCount(d.count ?? 0))
    .catch(() => {});
}, []);

// Sur le lien Maquettes :
<NavLink href="/maquettes">
  Maquettes
  {pendingCount > 0 && (
    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
      {pendingCount}
    </span>
  )}
</NavLink>
```

Ajouter dans `GET /api/maquettes/route.ts` le support du paramètre `?statut=X&count=1` qui retourne `{ count: N }`.

- [ ] **Step 3 : Commit**

```bash
git add src/app/(dashboard)/maquettes/ src/components/layout/sidebar.tsx
git commit -m "feat(maquettes): validation UI + badge sidebar ATTENTE_VALIDATION"
```

---

## ═══ PHASE 4 — Email workflow : preview + send + réponses ═══

### Task 14 — Composant `EmailPreviewPanel`

**Files:**
- Create: `crm/src/components/prospects/email-preview-panel.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// crm/src/components/prospects/email-preview-panel.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface EmailPreviewPanelProps {
  prospectId: string;
  onClose: () => void;
  onSent: () => void;
}

export function EmailPreviewPanel({ prospectId, onClose, onSent }: EmailPreviewPanelProps) {
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [sms, setSms] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  // Note: useEffect (not useState) pour l'auto-génération
  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erreur génération"); return; }
      setSujet(data.sujet ?? "");
      setCorps(data.corps ?? "");
      setSms(data.variante_sms ?? "");
    } catch { toast.error("Erreur réseau"); }
    finally { setLoading(false); }
  }

  async function send() {
    setSending(true);
    setConfirmSend(false);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send: true, sujet, corps }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Envoi échoué"); return; }
      if (data.sent) { onSent(); }
    } catch { toast.error("Erreur réseau"); }
    finally { setSending(false); }
  }

  // Auto-generate on mount — géré par useEffect déclaré au-dessus

  if (!sujet && !loading) {
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <button type="button" onClick={generate}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-medium text-white">
          ✉ Générer email ciblé
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-white/30">Email ciblé</span>
        <button type="button" onClick={onClose} className="text-white/20 hover:text-white/50">
          <X className="size-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-white/40">
          <Loader2 className="size-3 animate-spin" /> Génération en cours…
        </div>
      ) : (
        <>
          {/* Sujet */}
          <div>
            <p className="text-[10px] uppercase text-white/30 mb-1">Sujet</p>
            <input
              type="text"
              value={sujet}
              onChange={e => setSujet(e.target.value)}
              className="w-full rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Corps */}
          <div>
            <p className="text-[10px] uppercase text-white/30 mb-1">Corps</p>
            <textarea
              value={corps}
              onChange={e => setCorps(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* SMS variante */}
          {sms && (
            <div className="bg-white/3 rounded p-2">
              <p className="text-[10px] uppercase text-white/30 mb-1">Variante SMS / WhatsApp</p>
              <p className="text-xs text-white/50">{sms}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
              <RefreshCw className="size-3" /> Regénérer
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {confirmSend ? (
                <>
                  <span className="text-xs text-white/50">Confirmer l&apos;envoi ?</span>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmSend(false)}>Annuler</Button>
                  <Button size="sm" onClick={send} disabled={sending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    {sending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    Envoyer
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setConfirmSend(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Send className="size-3" /> Envoyer via Himalaya
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Ajouter réponse reçue */}
      <AddReplySection prospectId={prospectId} />
    </div>
  );
}

function AddReplySection({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/activites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "EMAIL_RECU", description: text.trim() }),
      });
      if (res.ok) {
        setText("");
        setOpen(false);
        toast.success("Réponse enregistrée");
      }
    } catch { toast.error("Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <div className="border-t border-border/20 pt-2 mt-1">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="text-xs text-white/30 hover:text-white/60 transition-colors">
          + Ajouter une réponse reçue du prospect
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase text-white/30">Réponse reçue (coller ici)</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="Coller la réponse du prospect…"
            className="w-full resize-none rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={save} disabled={saving || !text.trim()}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Mettre à jour la route email pour accepter sujet/corps custom**

Dans `crm/src/app/api/prospects/[id]/email/route.ts`, modifier la section envoi :

```typescript
// Lire sujet/corps custom si fournis (override génération)
const body = await req.clone().json().catch(() => ({}));
if (body.send === true && body.sujet && body.corps) {
  // Utiliser directement sans regénérer
  // ...exécuter himalaya avec body.sujet + body.corps
}
```

(Cette modification est mineure — le send avec `body.sujet`/`body.corps` devrait remplacer la génération Claude si ces champs sont présents.)

- [ ] **Step 3 : Ajouter `variante_sms` à la génération email**

Dans `crm/src/lib/prompts/email.ts`, ajouter dans le JSON de réponse attendu :
```typescript
// Dans le prompt, demander :
// "variante_sms": "<version < 300 chars pour SMS/WhatsApp, ton direct, sans formule de politesse>"
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/prospects/email-preview-panel.tsx
git commit -m "feat(email): EmailPreviewPanel — preview/edit/send + ajouter réponse reçue"
```

---

### Task 15 — Résumé échanges depuis API dédiée

**Files:**
- Create: `crm/src/app/api/prospects/[id]/resume/route.ts`
- Modify: `crm/src/components/prospects/resume-echanges-section.tsx`

- [ ] **Step 1 : Créer la route résumé**

```typescript
// crm/src/app/api/prospects/[id]/resume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { anthropic } from "@/lib/anthropic";

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { id } = await params;

  const prospect = await db.prospect.findUnique({
    where: { id },
    select: {
      nom: true,
      statutPipeline: true,
      activites: {
        orderBy: { date: "desc" },
        take: 20,
        select: { type: true, description: true, date: true },
      },
      maquettes: {
        orderBy: { createdAt: "desc" },
        select: { version: true, statut: true, demoUrl: true, retourClient: true, createdAt: true },
      },
    },
  });

  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (prospect.activites.length === 0) {
    return NextResponse.json({ resume: null });
  }

  const activitesText = prospect.activites
    .map(a => `${new Date(a.date).toLocaleDateString("fr-FR")} [${a.type}] ${a.description}`)
    .join("\n");

  const maquettesText = prospect.maquettes
    .map(m => `Maquette v${m.version ?? 1} (${m.statut}) — ${m.retourClient ? `Feedback: ${m.retourClient}` : ""}`)
    .join("\n");

  const prompt = `Tu es un assistant CRM. Génère un résumé factuel et chronologique des échanges avec ce prospect en 3-5 phrases maximum. Ton neutre, sans fioritures.

Prospect : ${prospect.nom} — Pipeline : ${prospect.statutPipeline}

Activités :
${activitesText}

${maquettesText ? `Maquettes :\n${maquettesText}` : ""}

Résumé (3-5 phrases) :`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const resume = response.content.find(b => b.type === "text")?.text?.trim() ?? null;
  return NextResponse.json({ resume });
}
```

- [ ] **Step 2 : Mettre à jour `ResumeEchangesSection`**

```tsx
// crm/src/components/prospects/resume-echanges-section.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

interface Props { prospectId: string; }

export function ResumeEchangesSection({ prospectId }: Props) {
  const [resume, setResume] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/resume`);
      if (!res.ok) return;
      const data = await res.json();
      setResume(data.resume ?? null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [prospectId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (!resume && !loading) return null;

  return (
    <div className="rounded-lg border border-border/30 bg-white/2 px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-white/30">Résumé des échanges</span>
        <button type="button" onClick={fetch_} disabled={loading}
          className="text-white/20 hover:text-white/50 transition-colors">
          {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        </button>
      </div>
      {loading && !resume ? (
        <p className="text-xs text-white/30 animate-pulse">Génération du résumé…</p>
      ) : (
        <p className="text-xs text-white/60 leading-relaxed">{resume}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/prospects/[id]/resume/ src/components/prospects/resume-echanges-section.tsx
git commit -m "feat(resume): route GET /resume + ResumeEchangesSection avec refresh"
```

---

## ═══ PHASE 5 — Pipeline automation ═══

### Task 16 — Helper `avancerPipeline`

**Files:**
- Create: `crm/src/lib/pipeline.ts`
- Create: `tests/pipeline.test.ts`

- [ ] **Step 1 : Écrire le test**

```typescript
// tests/pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  db: {
    prospect: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { avancerPipeline } from "../crm/src/lib/pipeline";
import { db } from "../crm/src/lib/db";

describe("avancerPipeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PROSPECT → CONTACTE quand EMAIL_ENVOYE", async () => {
    vi.mocked(db.prospect.findUnique).mockResolvedValue({
      id: "p1", statutPipeline: "PROSPECT"
    } as never);
    vi.mocked(db.prospect.update).mockResolvedValue({} as never);

    await avancerPipeline("p1", "EMAIL_ENVOYE");

    expect(db.prospect.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { statutPipeline: "CONTACTE", dateContact: expect.any(Date) },
    });
  });

  it("ne régresse pas : DEVIS reste DEVIS sur EMAIL_ENVOYE", async () => {
    vi.mocked(db.prospect.findUnique).mockResolvedValue({
      id: "p1", statutPipeline: "DEVIS"
    } as never);

    await avancerPipeline("p1", "EMAIL_ENVOYE");

    expect(db.prospect.update).not.toHaveBeenCalled();
  });

  it("CONTACTE → RDV quand action RDV", async () => {
    vi.mocked(db.prospect.findUnique).mockResolvedValue({
      id: "p1", statutPipeline: "CONTACTE"
    } as never);
    vi.mocked(db.prospect.update).mockResolvedValue({} as never);

    await avancerPipeline("p1", "RDV");

    expect(db.prospect.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { statutPipeline: "RDV", dateRdv: expect.any(Date) },
    });
  });
});
```

- [ ] **Step 2 : Lancer le test (doit échouer)**

```bash
cd crm && npx vitest run ../tests/pipeline.test.ts 2>&1 | tail -20
```

Attendu : FAIL — "Cannot find module"

- [ ] **Step 3 : Implémenter `avancerPipeline`**

```typescript
// crm/src/lib/pipeline.ts
import { db } from "@/lib/db";

type PipelineAction =
  | "EMAIL_ENVOYE"
  | "RDV"
  | "DEVIS_CREE"
  | "DEVIS_ACCEPTE"
  | "MAQUETTE_VALIDEE";

const ORDRE: Record<string, number> = {
  PROSPECT: 0,
  CONTACTE: 1,
  RDV: 2,
  DEVIS: 3,
  SIGNE: 4,
  LIVRE: 5,
};

export async function avancerPipeline(
  prospectId: string,
  action: PipelineAction
): Promise<void> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: { id: true, statutPipeline: true },
  });
  if (!prospect) return;

  const current = ORDRE[prospect.statutPipeline] ?? 0;

  const transitions: Record<PipelineAction, {
    requires: number;
    target: string;
    dateField?: string;
  }> = {
    EMAIL_ENVOYE: { requires: 0, target: "CONTACTE", dateField: "dateContact" },
    RDV: { requires: 1, target: "RDV", dateField: "dateRdv" },
    DEVIS_CREE: { requires: 2, target: "DEVIS", dateField: "dateDevis" },
    DEVIS_ACCEPTE: { requires: 3, target: "SIGNE", dateField: "dateSignature" },
    MAQUETTE_VALIDEE: { requires: 4, target: "LIVRE", dateField: "dateLivraison" },
  };

  const t = transitions[action];
  if (!t) return;

  // Only advance — never regress
  if (current > t.requires) return;
  if (ORDRE[t.target] <= current) return;

  const data: Record<string, unknown> = { statutPipeline: t.target };
  if (t.dateField) data[t.dateField] = new Date();

  await db.prospect.update({ where: { id: prospectId }, data });
}
```

- [ ] **Step 4 : Relancer le test (doit passer)**

```bash
npx vitest run ../tests/pipeline.test.ts 2>&1 | tail -10
```

Attendu : PASS (3 tests)

- [ ] **Step 5 : Commit**

```bash
git add src/lib/pipeline.ts ../tests/pipeline.test.ts
git commit -m "feat(lib): avancerPipeline — transitions statut pipeline sans régression"
```

---

### Task 17 — Câbler `avancerPipeline` dans les routes

**Files:**
- Modify: `crm/src/app/api/prospects/[id]/email/route.ts`
- Modify: `crm/src/app/api/devis/route.ts`
- Modify: `crm/src/app/api/devis/[id]/route.ts`
- Modify: `crm/src/app/api/maquettes/[id]/validate/route.ts`
- Modify: `crm/src/app/api/prospects/[id]/activites/route.ts`

- [ ] **Step 1 : Email send → EMAIL_ENVOYE**

Dans `email/route.ts`, après le `db.activite.create({ type: "EMAIL_ENVOYE" })` existant, ajouter :

```typescript
import { avancerPipeline } from "@/lib/pipeline";
// après création activité EMAIL_ENVOYE :
await avancerPipeline(id, "EMAIL_ENVOYE");
```

(Le PATCH `statutPipeline: "CONTACTE"` existant peut être retiré — `avancerPipeline` s'en charge.)

- [ ] **Step 2 : Devis créé → DEVIS_CREE**

Dans `POST /api/devis/route.ts`, après `db.devis.create`, ajouter :

```typescript
await avancerPipeline(newDevis.prospectId, "DEVIS_CREE");
```

- [ ] **Step 3 : Devis accepté → DEVIS_ACCEPTE**

Dans `PATCH /api/devis/[id]/route.ts`, chercher la condition où `statut` devient `"ACCEPTE"`. Après la mise à jour, ajouter :

```typescript
if (body.statut === "ACCEPTE") {
  await avancerPipeline(devis.prospectId, "DEVIS_ACCEPTE");
}
```

- [ ] **Step 4 : Maquette validée → MAQUETTE_VALIDEE**

Dans `/api/maquettes/[id]/validate/route.ts` (créé en Task 12), dans le cas `action === "valider"`, ajouter :

```typescript
await avancerPipeline(maquette.prospectId, "MAQUETTE_VALIDEE");
```

- [ ] **Step 5 : Activité RDV → RDV pipeline**

Dans `POST /api/prospects/[id]/activites/route.ts`, après création de l'activité, si `type === "RDV"` :

```typescript
if (body.type === "RDV") {
  await avancerPipeline(id, "RDV");
}
```

- [ ] **Step 6 : Build check**

```bash
cd crm && npm run build 2>&1 | tail -20
```

Attendu : ✓ Build réussi, 0 erreurs TypeScript.

- [ ] **Step 7 : Commit final Phase 5**

```bash
git add src/app/api/
git commit -m "feat(pipeline): avancerPipeline câblé — email, devis, maquette, RDV"
```

---

## ═══ VÉRIFICATION FINALE ═══

### Task 18 — Build + tests complets

- [ ] **Step 1 : Lancer tous les tests**

```bash
cd crm && npx vitest run 2>&1 | tail -20
```

Attendu : tous les tests passent.

- [ ] **Step 2 : Build de production**

```bash
npm run build 2>&1 | tail -30
```

Attendu : ✓ Compiled successfully, 0 errors.

- [ ] **Step 3 : Vérification manuelle rapide**

```bash
npm run dev
```

- [ ] `/prospection` : tableau avec checkboxes, bulk add
- [ ] `/prospects` : expand 2 colonnes, analyse SSE, email preview
- [ ] `/maquettes` : colonne validation, boutons valider/corriger
- [ ] Génération maquette : max 3, GitHub repo créé si GITHUB_TOKEN présent

- [ ] **Step 4 : Push**

```bash
git push origin main
```

---

## Variables d'environnement requises (nouveau)

| Variable | Description | Obligatoire |
|---|---|---|
| `GITHUB_TOKEN` | Personal Access Token GitHub (scope: repo) | Phase 3 |
| `GITHUB_USERNAME` | Username GitHub (ex: BenjaminB-BlueTeam) | Phase 3 |
| `FIRECRAWL_API_KEY` | Clé API Firecrawl | Phase 2 (optionnel, fallback fetch) |

Les variables existantes (`ANTHROPIC_API_KEY`, `GOOGLE_PLACES_KEY`, `NETLIFY_TOKEN`) restent inchangées.
