"use client";

import { useState } from "react";

interface MaquettePreviewProps {
  id: string;
  nom: string;
  hasPreview: boolean;
}

const FALLBACK_BG =
  "linear-gradient(135deg, rgba(88,28,135,0.55) 0%, rgba(67,56,202,0.35) 60%, rgba(17,24,39,0.9) 100%)";

export function MaquettePreview({ id, nom, hasPreview }: MaquettePreviewProps) {
  const [failed, setFailed] = useState(false);
  const initial = (nom || "?").charAt(0).toUpperCase();

  if (!hasPreview || failed) {
    return (
      <div
        className="h-40 flex items-center justify-center text-5xl font-bold text-white/20 select-none"
        style={{ background: FALLBACK_BG }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className="h-40 relative overflow-hidden bg-zinc-950">
      <iframe
        src={`/api/maquettes/${id}/preview`}
        title={`Aperçu ${nom}`}
        className="absolute top-0 left-0 border-0 pointer-events-none"
        style={{
          width: "200%",
          height: "200%",
          transform: "scale(0.5)",
          transformOrigin: "0 0",
        }}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {/* Fade overlay bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(10,8,20,0.85))",
        }}
      />
    </div>
  );
}
