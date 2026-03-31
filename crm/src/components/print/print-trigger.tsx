"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function PrintButton({ className, label }: { className?: string; label?: string }) {
  return (
    <button className={className} onClick={() => window.print()}>
      {label ?? "Imprimer / Enregistrer PDF"}
    </button>
  );
}
