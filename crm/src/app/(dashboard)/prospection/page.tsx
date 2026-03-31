// crm/src/app/(dashboard)/prospection/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ProspectionSearchPanel } from "@/components/prospection/prospection-search-panel";
import { ProspectionResultsPanel } from "@/components/prospection/prospection-results-panel";
import type { JobSteps, ProspectResult } from "@/lib/prospection-jobs";

const IS_VERCEL = process.env.NEXT_PUBLIC_VERCEL === "1";

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
    <div className="flex gap-5 h-full min-h-[calc(100vh-120px)] flex-col">
      {IS_VERCEL && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <strong>Mode production Vercel :</strong> la prospection automatique n&apos;est pas disponible en ligne.
          Lancez{" "}
          <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-xs">
            node prospect.js &quot;votre recherche&quot;
          </code>{" "}
          en local, puis synchronisez avec{" "}
          <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-xs">
            npm run sync-crm
          </code>
          .
        </div>
      )}
      <div className="flex gap-5 h-full">
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
    </div>
  );
}
