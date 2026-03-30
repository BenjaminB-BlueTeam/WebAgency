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
      <p className="text-[0.65rem] text-violet-300 uppercase tracking-widest font-semibold">
        Nouvelle recherche
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !isRunning && onSubmit()}
        placeholder="boulanger Steenvoorde"
        className="w-full bg-white/6 border border-violet-400/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60 transition-colors"
        disabled={isRunning}
      />

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
              &ldquo;{h.query}&rdquo; · {h.resultatsCount} résultats
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
