// crm/src/app/api/prospection/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { query, mode = "html" } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  // A03 / A05 — Input length limit to prevent abuse
  if (typeof query !== "string" || query.length > 200) {
    return NextResponse.json(
      { error: "query trop longue (max 200 caractères)" },
      { status: 400 }
    );
  }

  const safeMode: "html" | "astro" = mode === "astro" ? "astro" : "html";

  const jobId = randomUUID();
  createJob(jobId, query.trim(), safeMode);

  // Spawn pipeline asynchronously — do not await
  runPipeline(jobId, query.trim(), safeMode).catch(console.error);

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
  } else if (line.includes("Démo :")) {
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

  // Find prospects from this specific query (last mises_a_jour entry matching query)
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
      prospectsAjoutes: results.length,
      date: new Date(),
    },
  });

  return results;
}
