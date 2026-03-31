# Prospection Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Prospection CRM page — a split-panel UI that launches prospect.js, streams progress in real-time, and displays full-detail prospect result cards.

**Architecture:** Left panel holds the search form (keyword input + HTML/Astro toggle + history), right panel shows 5-step progress then prospect cards. A POST API spawns `prospect.js` as a subprocess, stores job state in a singleton Map, and a GET SSE API streams events to the client. On completion, results from `crm.json` are upserted into the Prisma DB.

**Tech Stack:** Next.js App Router (v16), Tailwind CSS v4, Prisma 7 + SQLite, Server-Sent Events (native EventSource), Node.js child_process.spawn, existing glass/dark design system.

---

## File Structure

```
crm/
├── prisma/schema.prisma                              MODIFY — add adresse, noteGoogle, nbAvisGoogle
├── src/
│   ├── lib/prospection-jobs.ts                       NEW — in-memory job store + pub/sub types
│   ├── app/api/prospection/
│   │   ├── start/route.ts                            NEW — POST: spawn pipeline, return jobId
│   │   ├── [jobId]/stream/route.ts                   NEW — GET: SSE stream of job events
│   │   └── history/route.ts                          NEW — GET: last 10 Recherche records
│   ├── app/(dashboard)/prospection/page.tsx          MODIFY — replace stub with full page
│   └── components/prospection/
│       ├── prospection-search-panel.tsx              NEW — left panel (form + history)
│       ├── prospection-progress.tsx                  NEW — 5-step progress bar
│       ├── prospect-result-card.tsx                  NEW — full-detail prospect card
│       └── prospection-results-panel.tsx             NEW — right panel (progress + cards)
```

---

## Task 1: Schema Migration — Add Prospect Fields

**Files:**
- Modify: `crm/prisma/schema.prisma`

- [ ] **Step 1: Add 3 fields to the Prospect model in schema.prisma**

In `crm/prisma/schema.prisma`, add after `source String?` (line ~31):

```prisma
  adresse        String?
  noteGoogle     Float?
  nbAvisGoogle   Int?
```

Full updated model excerpt:
```prisma
model Prospect {
  id                 String     @id @default(cuid())
  nom                String
  activite           String
  ville              String
  telephone          String?
  email              String?
  siteUrl            String?
  adresse            String?
  noteGoogle         Float?
  nbAvisGoogle       Int?
  statut             String
  priorite           String
  raison             String?
  argumentCommercial String?
  statutPipeline     String     @default("PROSPECT")
  dateAjout          DateTime   @default(now())
  dateContact        DateTime?
  dateRdv            DateTime?
  dateDevis          DateTime?
  dateSignature      DateTime?
  dateLivraison      DateTime?
  notes              String?
  source             String?

  maquettes          Maquette[]
  devis              Devis[]
  factures           Facture[]
  activites          Activite[]

  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  @@unique([nom, ville])
}
```

- [ ] **Step 2: Run migration**

```bash
cd crm
DATABASE_URL="file:./prisma/dev.db" npx prisma migrate dev --name add-prospection-fields
```

Expected: `✔ Generated Prisma Client` and migration file created in `prisma/migrations/`.

- [ ] **Step 3: Verify**

```bash
DATABASE_URL="file:./prisma/dev.db" npx prisma studio
```

Open Prospect table — confirm `adresse`, `noteGoogle`, `nbAvisGoogle` columns exist.

- [ ] **Step 4: Commit**

```bash
cd crm
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prospection): add adresse, noteGoogle, nbAvisGoogle to Prospect schema"
```

---

## Task 2: Job Store

**Files:**
- Create: `crm/src/lib/prospection-jobs.ts`

- [ ] **Step 1: Create the job store file**

```typescript
// crm/src/lib/prospection-jobs.ts

export type StepStatus = "idle" | "running" | "done" | "error";

export interface JobSteps {
  recherche: StepStatus;
  concurrents: StepStatus;
  maquettes: StepStatus;
  deploiement: StepStatus;
  crm: StepStatus;
}

export interface ProspectResult {
  id: string;
  nom: string;
  activite: string;
  ville: string;
  telephone: string | null;
  email: string | null;
  siteUrl: string | null;
  adresse: string | null;
  noteGoogle: number | null;
  statut: string;
  priorite: string;
  argumentCommercial: string | null;
  maquettes: { id: string; demoUrl: string | null }[];
}

export interface ProspectionJob {
  id: string;
  query: string;
  mode: "html" | "astro";
  status: "running" | "done" | "error";
  steps: JobSteps;
  results: ProspectResult[];
  error?: string;
  startedAt: Date;
}

type EventCallback = (event: string, data: unknown) => void;

const jobs = new Map<string, ProspectionJob>();
const listeners = new Map<string, Set<EventCallback>>();

export function createJob(
  id: string,
  query: string,
  mode: "html" | "astro"
): ProspectionJob {
  const job: ProspectionJob = {
    id,
    query,
    mode,
    status: "running",
    steps: {
      recherche: "idle",
      concurrents: "idle",
      maquettes: "idle",
      deploiement: "idle",
      crm: "idle",
    },
    results: [],
    startedAt: new Date(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): ProspectionJob | undefined {
  return jobs.get(id);
}

export function updateJobSteps(id: string, steps: JobSteps): void {
  const job = jobs.get(id);
  if (!job) return;
  job.steps = steps;
  emit(id, "progress", { steps, status: job.status });
}

export function completeJob(id: string, results: ProspectResult[]): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "done";
  job.results = results;
  // Mark any still-running steps as done
  for (const k of Object.keys(job.steps) as (keyof JobSteps)[]) {
    if (job.steps[k] === "running") job.steps[k] = "done";
  }
  emit(id, "progress", { steps: job.steps, status: "done" });
  emit(id, "done", { results });
}

export function failJob(id: string, error: string): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "error";
  job.error = error;
  emit(id, "error", { error });
}

export function subscribeToJob(
  id: string,
  callback: EventCallback
): () => void {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(callback);
  return () => listeners.get(id)?.delete(callback);
}

function emit(id: string, event: string, data: unknown): void {
  const set = listeners.get(id);
  if (!set) return;
  for (const cb of set) cb(event, data);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prospection-jobs.ts
git commit -m "feat(prospection): add in-memory job store with pub/sub"
```

---

## Task 3: History API Route

**Files:**
- Create: `crm/src/app/api/prospection/history/route.ts`

- [ ] **Step 1: Create the history route**

```typescript
// crm/src/app/api/prospection/history/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const searches = await db.recherche.findMany({
    orderBy: { date: "desc" },
    take: 10,
    select: {
      id: true,
      query: true,
      resultatsCount: true,
      prospectsAjoutes: true,
      date: true,
    },
  });
  return NextResponse.json(searches);
}
```

- [ ] **Step 2: Test**

Start dev server and run:
```bash
curl http://localhost:3000/api/prospection/history
```

Expected: `[]` or a JSON array of past searches.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospection/history/route.ts
git commit -m "feat(prospection): add history API route"
```

---

## Task 4: Start API Route

**Files:**
- Create: `crm/src/app/api/prospection/start/route.ts`

- [ ] **Step 1: Create the start route**

```typescript
// crm/src/app/api/prospection/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";
import {
  createJob,
  getJob,
  updateJobSteps,
  completeJob,
  failJob,
  type JobSteps,
  type ProspectResult,
} from "@/lib/prospection-jobs";

// WebAgency root (parent of crm/)
const PIPELINE_DIR = path.resolve(process.cwd(), "..");

export async function POST(req: NextRequest) {
  const { query, mode = "html" } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const jobId = randomUUID();
  createJob(jobId, query.trim(), mode as "html" | "astro");

  // Spawn pipeline asynchronously — do not await
  runPipeline(jobId, query.trim(), mode as "html" | "astro").catch(
    console.error
  );

  return NextResponse.json({ jobId });
}

async function runPipeline(
  jobId: string,
  query: string,
  mode: "html" | "astro"
): Promise<void> {
  const args = ["prospect.js", query, ...(mode === "astro" ? ["--astro"] : [])];

  const child = spawn(process.execPath, args, {
    cwd: PIPELINE_DIR,
    env: { ...process.env },
  });

  let buffer = "";

  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      parseAndUpdateSteps(jobId, line);
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    console.error("[prospect.js stderr]", chunk.toString());
  });

  await new Promise<void>((resolve, reject) => {
    child.on("close", async (code) => {
      if (code !== 0) {
        failJob(jobId, `Pipeline exited with code ${code}`);
        reject(new Error(`Pipeline failed: exit code ${code}`));
        return;
      }
      try {
        const results = await syncResults(query);
        completeJob(jobId, results);
        resolve();
      } catch (err) {
        failJob(jobId, String(err));
        reject(err);
      }
    });

    child.on("error", (err) => {
      failJob(jobId, err.message);
      reject(err);
    });
  });
}

function parseAndUpdateSteps(jobId: string, line: string): void {
  const job = getJob(jobId);
  if (!job) return;

  const s: JobSteps = { ...job.steps };

  if (line.includes("Étape 1 — Recherche")) {
    s.recherche = "running";
  } else if (line.includes("résultats trouvés")) {
    s.recherche = "done";
  } else if (line.includes("Étape 1b — Analyse concurrentielle")) {
    s.concurrents = "running";
  } else if (line.includes("Traitement :")) {
    if (s.concurrents !== "done") s.concurrents = "done";
    s.maquettes = "running";
  } else if (line.includes("Déploiement maquette")) {
    if (s.maquettes !== "done") s.maquettes = "done";
    s.deploiement = "running";
  } else if (
    line.includes("Démo :") ||
    line.includes("page de présentation")
  ) {
    if (s.deploiement !== "done") s.deploiement = "done";
    s.crm = "running";
  } else if (line.includes("CRM :")) {
    s.crm = "done";
  }

  updateJobSteps(jobId, s);
}

interface CrmProspect {
  nom: string;
  activite?: string;
  ville?: string;
  telephone?: string | null;
  email?: string | null;
  site_url?: string | null;
  adresse?: string | null;
  rating?: number | null;
  statut: string;
  priorite: string;
  raison?: string | null;
  argument_commercial?: string | null;
}

async function syncResults(query: string): Promise<ProspectResult[]> {
  const crmPath = path.join(PIPELINE_DIR, "crm.json");
  if (!fs.existsSync(crmPath)) return [];

  const crm = JSON.parse(fs.readFileSync(crmPath, "utf8")) as {
    prospects: CrmProspect[];
    mises_a_jour?: { date: string; query: string; count: number; added: number }[];
  };

  // Find prospects from this specific query (last mises_a_jour entry)
  const lastUpdate = crm.mises_a_jour?.findLast((u) => u.query === query);
  const countToSync = lastUpdate?.count ?? 5;

  // Take the last `countToSync` prospects that aren't SITE_CORRECT
  const candidates = crm.prospects
    .filter((p) => p.statut !== "SITE_CORRECT")
    .slice(-countToSync);

  const results: ProspectResult[] = [];

  for (const p of candidates) {
    if (!p.nom || !p.ville) continue;

    const record = await db.prospect.upsert({
      where: { nom_ville: { nom: p.nom, ville: p.ville ?? "" } },
      create: {
        nom: p.nom,
        activite: p.activite ?? query,
        ville: p.ville ?? "",
        telephone: p.telephone ?? null,
        email: p.email ?? null,
        siteUrl: p.site_url ?? null,
        adresse: p.adresse ?? null,
        noteGoogle: p.rating ?? null,
        statut: p.statut,
        priorite: p.priorite,
        raison: p.raison ?? null,
        argumentCommercial: p.argument_commercial ?? null,
        source: "PROSPECTION",
      },
      update: {
        telephone: p.telephone ?? undefined,
        email: p.email ?? undefined,
        siteUrl: p.site_url ?? undefined,
        adresse: p.adresse ?? undefined,
        noteGoogle: p.rating ?? undefined,
        argumentCommercial: p.argument_commercial ?? undefined,
      },
      include: {
        maquettes: { select: { id: true, demoUrl: true } },
      },
    });

    results.push({
      id: record.id,
      nom: record.nom,
      activite: record.activite,
      ville: record.ville,
      telephone: record.telephone,
      email: record.email,
      siteUrl: record.siteUrl,
      adresse: record.adresse,
      noteGoogle: record.noteGoogle,
      statut: record.statut,
      priorite: record.priorite,
      argumentCommercial: record.argumentCommercial,
      maquettes: record.maquettes,
    });
  }

  // Log search to Recherche table
  await db.recherche.create({
    data: {
      query,
      resultatsCount: results.length,
      prospectsAjoutes: results.filter((r) => r.maquettes.length === 0).length,
      date: new Date(),
    },
  });

  return results;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospection/start/route.ts
git commit -m "feat(prospection): add pipeline start API (spawn + progress tracking)"
```

---

## Task 5: SSE Stream API Route

**Files:**
- Create: `crm/src/app/api/prospection/[jobId]/stream/route.ts`

- [ ] **Step 1: Create the SSE stream route**

```typescript
// crm/src/app/api/prospection/[jobId]/stream/route.ts
import { NextRequest } from "next/server";
import { getJob, subscribeToJob } from "@/lib/prospection-jobs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      const job = getJob(jobId);
      if (!job) {
        send("error", { error: "Job not found" });
        controller.close();
        return;
      }

      // Send current state immediately
      send("progress", { steps: job.steps, status: job.status });

      // If already finished, send final event and close
      if (job.status === "done") {
        send("done", { results: job.results });
        controller.close();
        return;
      }
      if (job.status === "error") {
        send("error", { error: job.error });
        controller.close();
        return;
      }

      // Subscribe to future events
      const unsubscribe = subscribeToJob(jobId, (event, data) => {
        send(event, data);
        if (event === "done" || event === "error") {
          controller.close();
          unsubscribe();
        }
      });

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospection/[jobId]/stream/route.ts
git commit -m "feat(prospection): add SSE stream route for real-time job progress"
```

---

## Task 6: Prospect Result Card Component

**Files:**
- Create: `crm/src/components/prospection/prospect-result-card.tsx`

- [ ] **Step 1: Create the component**

This card shows full detail: address, phone, email, current site, Google rating, commercial argument, and action buttons. The top prospect (priorite=HAUTE) gets the `glass-violet` treatment; others get `glass`.

```tsx
// crm/src/components/prospection/prospect-result-card.tsx
"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Phone, Mail, Globe, Star, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { ProspectResult } from "@/lib/prospection-jobs";

interface ProspectResultCardProps {
  prospect: ProspectResult;
  isTop?: boolean;
}

export function ProspectResultCard({ prospect, isTop = false }: ProspectResultCardProps) {
  const hasMaquette = prospect.maquettes.length > 0;
  const demoUrl = prospect.maquettes.find((m) => m.demoUrl)?.demoUrl;
  const maquetteId = prospect.maquettes[0]?.id;

  return (
    <div
      className={cn(
        "rounded-xl p-4",
        isTop ? "glass-violet" : "glass"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{prospect.nom}</span>
            <StatusBadge type="priorite" value={prospect.priorite} />
            <StatusBadge type="statut" value={prospect.statut} />
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            {prospect.activite} · {prospect.ville}
          </p>
        </div>
        {hasMaquette && (
          <span className="shrink-0 text-[0.65rem] font-medium text-green-400 bg-green-400/10 border border-green-400/25 rounded px-2 py-0.5">
            ✓ Maquette prête
          </span>
        )}
      </div>

      {/* Contact details grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-black/20 rounded-lg p-3">
        <DetailRow icon={<MapPin className="w-3 h-3" />} label="Adresse" value={prospect.adresse} />
        <DetailRow icon={<Phone className="w-3 h-3" />} label="Téléphone" value={prospect.telephone} />
        <DetailRow icon={<Mail className="w-3 h-3" />} label="Email" value={prospect.email} />
        <DetailRow
          icon={<Globe className="w-3 h-3" />}
          label="Site actuel"
          value={prospect.siteUrl}
          isUrl
          statusHint={prospect.statut}
        />
        {prospect.noteGoogle !== null && (
          <DetailRow
            icon={<Star className="w-3 h-3" />}
            label="Note Google"
            value={`${prospect.noteGoogle} / 5`}
          />
        )}
      </div>

      {/* Commercial argument */}
      {prospect.argumentCommercial && (
        <div className="border-l-2 border-violet-400/40 pl-3 py-1 mb-3 bg-violet-500/5 rounded-r">
          <p className="text-[0.65rem] text-violet-300 uppercase tracking-wide mb-0.5">
            Argument commercial
          </p>
          <p className="text-xs text-slate-300 italic">
            "{prospect.argumentCommercial}"
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {demoUrl && (
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-violet-300 bg-violet-500/20 border border-violet-500/40 hover:bg-violet-500/30 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Voir maquette
          </a>
        )}
        {maquetteId && (
          <Link
            href={`/maquettes/${maquetteId}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20 transition-colors"
          >
            Proposition
          </Link>
        )}
        {prospect.id && (
          <Link
            href={`/prospects/${prospect.id}`}
            className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Fiche <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isUrl = false,
  statusHint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  isUrl?: boolean;
  statusHint?: string;
}) {
  const display = value ?? "—";
  const isObsolete = isUrl && statusHint === "SITE_OBSOLETE";

  return (
    <div className="flex items-start gap-1.5">
      <span className="text-white/40 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.6rem] text-white/30 uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "text-[0.7rem] truncate",
            !value ? "text-white/30" : isObsolete ? "text-yellow-400" : "text-white/80"
          )}
        >
          {isObsolete ? `${display} (obsolète)` : display}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/prospection/prospect-result-card.tsx
git commit -m "feat(prospection): add ProspectResultCard with full detail layout"
```

---

## Task 7: Progress Bar Component

**Files:**
- Create: `crm/src/components/prospection/prospection-progress.tsx`

- [ ] **Step 1: Create the progress component**

```tsx
// crm/src/components/prospection/prospection-progress.tsx
import { cn } from "@/lib/utils";
import type { JobSteps, StepStatus } from "@/lib/prospection-jobs";

const STEPS: { key: keyof JobSteps; label: string }[] = [
  { key: "recherche", label: "Recherche" },
  { key: "concurrents", label: "Concurrents" },
  { key: "maquettes", label: "Maquettes" },
  { key: "deploiement", label: "Déploiement" },
  { key: "crm", label: "CRM" },
];

interface ProspectionProgressProps {
  steps: JobSteps;
  jobStatus: "running" | "done" | "error";
}

export function ProspectionProgress({ steps, jobStatus }: ProspectionProgressProps) {
  const allDone = jobStatus === "done";

  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {STEPS.map((step, i) => {
          const status = steps[step.key];
          return (
            <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
              <StepIcon status={status} />
              <span
                className={cn(
                  "text-[0.65rem] whitespace-nowrap font-medium",
                  status === "done" ? "text-green-400" :
                  status === "running" ? "text-violet-300" :
                  status === "error" ? "text-red-400" :
                  "text-white/30"
                )}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px min-w-[8px]",
                    status === "done" ? "bg-green-400/30" : "bg-white/8"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <span className="shrink-0 text-[0.65rem] text-green-400 bg-green-400/10 border border-green-400/20 rounded px-2 py-0.5 font-medium">
          Terminé ✓
        </span>
      )}
      {jobStatus === "running" && (
        <span className="shrink-0 text-[0.65rem] text-violet-300 animate-pulse">
          En cours…
        </span>
      )}
      {jobStatus === "error" && (
        <span className="shrink-0 text-[0.65rem] text-red-400">
          Erreur
        </span>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return <span className="text-green-400 text-sm leading-none">✓</span>;
  }
  if (status === "running") {
    return (
      <span className="text-violet-300 text-sm leading-none animate-spin inline-block">
        ⟳
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-red-400 text-sm leading-none">✗</span>;
  }
  return <span className="text-white/20 text-sm leading-none">○</span>;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/prospection/prospection-progress.tsx
git commit -m "feat(prospection): add ProspectionProgress 5-step bar"
```

---

## Task 8: Search Panel Component (Left)

**Files:**
- Create: `crm/src/components/prospection/prospection-search-panel.tsx`

- [ ] **Step 1: Create the search panel**

```tsx
// crm/src/components/prospection/prospection-search-panel.tsx
"use client";

import { cn } from "@/lib/utils";

interface SearchHistory {
  id: string;
  query: string;
  resultatsCount: number;
  date: string;
}

interface ProspectionSearchPanelProps {
  query: string;
  onQueryChange: (v: string) => void;
  mode: "html" | "astro";
  onModeChange: (v: "html" | "astro") => void;
  onSubmit: () => void;
  isRunning: boolean;
  history: SearchHistory[];
  onHistoryClick: (query: string) => void;
}

export function ProspectionSearchPanel({
  query,
  onQueryChange,
  mode,
  onModeChange,
  onSubmit,
  isRunning,
  history,
  onHistoryClick,
}: ProspectionSearchPanelProps) {
  return (
    <div className="glass-violet rounded-xl p-4 flex flex-col gap-4 h-full">
      {/* Title */}
      <p className="text-[0.65rem] text-violet-300 uppercase tracking-widest font-semibold">
        Nouvelle recherche
      </p>

      {/* Query input */}
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !isRunning && onSubmit()}
        placeholder="boulanger Steenvoorde"
        className="w-full bg-white/6 border border-violet-400/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60 transition-colors"
        disabled={isRunning}
      />

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange("html")}
          className={cn(
            "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors",
            mode === "html"
              ? "bg-violet-500/30 border border-violet-400/50 text-violet-200"
              : "bg-white/4 border border-white/8 text-white/40 hover:text-white/60"
          )}
          disabled={isRunning}
        >
          HTML
        </button>
        <button
          onClick={() => onModeChange("astro")}
          className={cn(
            "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors",
            mode === "astro"
              ? "bg-violet-500/30 border border-violet-400/50 text-violet-200"
              : "bg-white/4 border border-white/8 text-white/40 hover:text-white/60"
          )}
          disabled={isRunning}
        >
          Astro
        </button>
      </div>

      {/* Launch button */}
      <button
        onClick={onSubmit}
        disabled={isRunning || !query.trim()}
        className={cn(
          "w-full rounded-lg py-2.5 text-sm font-bold text-white transition-all",
          isRunning || !query.trim()
            ? "bg-violet-500/30 cursor-not-allowed opacity-60"
            : "bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 shadow-lg shadow-violet-500/20"
        )}
      >
        {isRunning ? "⟳ En cours…" : "▶ Lancer la prospection"}
      </button>

      {/* History */}
      {history.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-white/6 pt-4 mt-auto">
          <p className="text-[0.6rem] text-white/30 uppercase tracking-wide mb-1">
            Historique
          </p>
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => onHistoryClick(h.query)}
              disabled={isRunning}
              className="text-left text-xs text-violet-300 px-2 py-1.5 bg-violet-500/6 hover:bg-violet-500/12 rounded transition-colors truncate"
              title={h.query}
            >
              "{h.query}" · {h.resultatsCount} résultats
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/prospection/prospection-search-panel.tsx
git commit -m "feat(prospection): add ProspectionSearchPanel (left panel)"
```

---

## Task 9: Results Panel Component (Right)

**Files:**
- Create: `crm/src/components/prospection/prospection-results-panel.tsx`

- [ ] **Step 1: Create the results panel**

```tsx
// crm/src/components/prospection/prospection-results-panel.tsx
"use client";

import Link from "next/link";
import { ProspectionProgress } from "./prospection-progress";
import { ProspectResultCard } from "./prospect-result-card";
import type { JobSteps, ProspectResult } from "@/lib/prospection-jobs";

interface ProspectionResultsPanelProps {
  jobStatus: "idle" | "running" | "done" | "error";
  steps: JobSteps;
  results: ProspectResult[];
  query: string;
  error?: string;
}

const IDLE_STEPS: JobSteps = {
  recherche: "idle",
  concurrents: "idle",
  maquettes: "idle",
  deploiement: "idle",
  crm: "idle",
};

export function ProspectionResultsPanel({
  jobStatus,
  steps,
  results,
  query,
  error,
}: ProspectionResultsPanelProps) {
  // Idle state — placeholder
  if (jobStatus === "idle") {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <p className="text-sm text-white/30">
          Lancez une recherche pour trouver des prospects
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Progress bar */}
      <ProspectionProgress
        steps={jobStatus === "running" || jobStatus === "done" ? steps : IDLE_STEPS}
        jobStatus={jobStatus === "idle" ? "running" : jobStatus}
      />

      {/* Error state */}
      {jobStatus === "error" && error && (
        <div className="glass-danger rounded-xl p-4">
          <p className="text-sm text-red-400 font-medium">Erreur pipeline</p>
          <p className="text-xs text-red-300/70 mt-1">{error}</p>
        </div>
      )}

      {/* Results header */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 font-medium">
            {results.length} prospect{results.length > 1 ? "s" : ""} — "{query}"
          </span>
          <Link
            href="/prospects"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Voir dans Prospects →
          </Link>
        </div>
      )}

      {/* Prospect cards */}
      <div className="flex flex-col gap-3">
        {results.map((prospect, i) => (
          <ProspectResultCard
            key={prospect.id || prospect.nom}
            prospect={prospect}
            isTop={i === 0 && prospect.priorite === "HAUTE"}
          />
        ))}
      </div>

      {/* Running state — no results yet */}
      {jobStatus === "running" && results.length === 0 && (
        <div className="glass rounded-xl p-6 flex items-center justify-center">
          <p className="text-sm text-white/40 animate-pulse">
            Analyse en cours…
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/prospection/prospection-results-panel.tsx
git commit -m "feat(prospection): add ProspectionResultsPanel (right panel)"
```

---

## Task 10: Main Page

**Files:**
- Modify: `crm/src/app/(dashboard)/prospection/page.tsx`

- [ ] **Step 1: Replace the stub with the full page**

```tsx
// crm/src/app/(dashboard)/prospection/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ProspectionSearchPanel } from "@/components/prospection/prospection-search-panel";
import { ProspectionResultsPanel } from "@/components/prospection/prospection-results-panel";
import type { JobSteps, ProspectResult } from "@/lib/prospection-jobs";

const IDLE_STEPS: JobSteps = {
  recherche: "idle",
  concurrents: "idle",
  maquettes: "idle",
  deploiement: "idle",
  crm: "idle",
};

interface SearchHistory {
  id: string;
  query: string;
  resultatsCount: number;
  date: string;
}

export default function ProspectionPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"html" | "astro">("html");
  const [jobStatus, setJobStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [steps, setSteps] = useState<JobSteps>(IDLE_STEPS);
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [jobError, setJobError] = useState<string | undefined>();
  const [history, setHistory] = useState<SearchHistory[]>([]);

  const esRef = useRef<EventSource | null>(null);

  // Load history on mount
  useEffect(() => {
    fetch("/api/prospection/history")
      .then((r) => r.json())
      .then(setHistory)
      .catch(console.error);
  }, []);

  // Reload history when a job completes
  useEffect(() => {
    if (jobStatus === "done") {
      fetch("/api/prospection/history")
        .then((r) => r.json())
        .then(setHistory)
        .catch(console.error);
    }
  }, [jobStatus]);

  function handleSubmit() {
    if (!query.trim() || jobStatus === "running") return;

    // Close existing SSE connection
    esRef.current?.close();
    esRef.current = null;

    // Reset state
    setJobStatus("running");
    setSteps(IDLE_STEPS);
    setResults([]);
    setJobError(undefined);
    setActiveQuery(query.trim());

    // Start pipeline
    fetch("/api/prospection/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim(), mode }),
    })
      .then((r) => r.json())
      .then(({ jobId, error }) => {
        if (error) {
          setJobStatus("error");
          setJobError(error);
          return;
        }
        // Open SSE stream
        const es = new EventSource(`/api/prospection/${jobId}/stream`);
        esRef.current = es;

        es.addEventListener("progress", (e) => {
          const data = JSON.parse(e.data);
          setSteps(data.steps);
        });

        es.addEventListener("done", (e) => {
          const data = JSON.parse(e.data);
          setResults(data.results ?? []);
          setJobStatus("done");
          es.close();
          esRef.current = null;
        });

        es.addEventListener("error", (e) => {
          const msg =
            e instanceof MessageEvent
              ? JSON.parse(e.data)?.error ?? "Erreur inconnue"
              : "Connexion perdue";
          setJobStatus("error");
          setJobError(msg);
          es.close();
          esRef.current = null;
        });
      })
      .catch((err) => {
        setJobStatus("error");
        setJobError(err.message);
      });
  }

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  return (
    <div className="flex gap-5 h-full min-h-[calc(100vh-120px)]">
      {/* Left panel — fixed width */}
      <div className="w-72 shrink-0">
        <ProspectionSearchPanel
          query={query}
          onQueryChange={setQuery}
          mode={mode}
          onModeChange={setMode}
          onSubmit={handleSubmit}
          isRunning={jobStatus === "running"}
          history={history}
          onHistoryClick={(q) => setQuery(q)}
        />
      </div>

      {/* Right panel — flex */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <ProspectionResultsPanel
          jobStatus={jobStatus}
          steps={steps}
          results={results}
          query={activeQuery}
          error={jobError}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
cd crm
npm run dev
```

Open http://localhost:3000/prospection. Verify:
- Left panel renders with search input, HTML/Astro toggle, disabled launch button
- Right panel shows placeholder "Lancez une recherche"
- Typing in the input enables the launch button
- History loads (empty or with past searches)

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/prospection/page.tsx
git commit -m "feat(prospection): implement full Prospection page with SSE pipeline integration"
```

---

## Task 11: Final Integration Commit

- [ ] **Step 1: Stage all prospection components**

```bash
cd crm
git add src/components/prospection/
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build completes with no errors. (Ignore pre-existing `Date.now` and `setState` lint warnings in other files — those are pre-existing issues not introduced by this feature.)

- [ ] **Step 3: Final commit**

```bash
git commit -m "feat(prospection): complete prospection page — pipeline integration, SSE progress, full-detail cards"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Split panel layout (left: form+history, right: progress+results)
- ✅ HTML/Astro mode toggle
- ✅ 5-step progress display
- ✅ Full-detail prospect cards (address, phone, email, site, Google rating, commercial argument)
- ✅ All cards same detail level (no condensed version)
- ✅ History of past searches
- ✅ Pipeline integration via subprocess spawn
- ✅ Real-time progress via SSE
- ✅ Results synced to DB after completion

**Schema fields added:** `adresse`, `noteGoogle`, `nbAvisGoogle` (horaires omitted — not yet extracted by pipeline, covered by TODO in CLAUDE.md)

**Type consistency:** `ProspectResult`, `JobSteps`, `StepStatus` defined once in `lib/prospection-jobs.ts` and imported everywhere — no drift.

**Known limitations:**
- In-memory job store resets on server restart (acceptable for local dev tool)
- Pipeline must be running from WebAgency root — verified via `PIPELINE_DIR = path.resolve(process.cwd(), '..')`
- `crm.json` sync uses `findLast` (Node 18+) — acceptable given engines requirement of Node 22+
