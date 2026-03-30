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
  nbAvisGoogle: number | null;
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
  // Mark any still-running steps as error
  for (const k of Object.keys(job.steps) as (keyof JobSteps)[]) {
    if (job.steps[k] === "running") job.steps[k] = "error";
  }
  emit(id, "progress", { steps: job.steps, status: "error" });
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
