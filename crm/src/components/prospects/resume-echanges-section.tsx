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
