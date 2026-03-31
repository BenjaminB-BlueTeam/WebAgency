// crm/src/app/(dashboard)/prospection/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ProspectionSearchPanel } from "@/components/prospection/prospection-search-panel";
import { ProspectionResultsPanel } from "@/components/prospection/prospection-results-panel";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface SearchHistory {
  id: string;
  query: string;
  resultatsCount: number;
  date: string;
}

export default function ProspectionPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState<SearchProspect[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [history, setHistory] = useState<SearchHistory[]>([]);

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/prospection/history")
      .then((r) => r.json())
      .then(setHistory)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (status === "done") {
      fetch("/api/prospection/history")
        .then((r) => r.json())
        .then(setHistory)
        .catch(console.error);
    }
  }, [status]);

  function handleSubmit() {
    if (!query.trim() || status === "running") return;

    esRef.current?.close();
    esRef.current = null;

    setStatus("running");
    setStatusMessage("Connexion...");
    setResults([]);
    setError(undefined);
    setActiveQuery(query.trim());

    const es = new EventSource(
      `/api/prospection/search?q=${encodeURIComponent(query.trim())}`
    );
    esRef.current = es;

    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        setStatus("done");
        es.close();
        esRef.current = null;
        return;
      }
      try {
        const data = JSON.parse(e.data) as {
          type: string;
          message?: string;
          step?: string;
        } & Partial<SearchProspect>;

        if (data.type === "status" && data.message) {
          setStatusMessage(data.message);
        } else if (data.type === "prospect") {
          const { type: _type, ...prospect } = data;
          setResults((prev) => [...prev, prospect as SearchProspect]);
        } else if (data.type === "error" && data.message) {
          setStatus("error");
          setError(data.message);
          es.close();
          esRef.current = null;
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      if (status !== "done") {
        setStatus("error");
        setError("Connexion SSE perdue");
      }
      es.close();
      esRef.current = null;
    };
  }

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  return (
    <div className="flex gap-5 h-full min-h-[calc(100vh-120px)] flex-col">
      <div className="flex gap-5 h-full">
        <div className="w-72 shrink-0">
          <ProspectionSearchPanel
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            isRunning={status === "running"}
            history={history}
            onHistoryClick={(q) => setQuery(q)}
          />
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">
          <ProspectionResultsPanel
            status={status}
            statusMessage={statusMessage}
            results={results}
            query={activeQuery}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
