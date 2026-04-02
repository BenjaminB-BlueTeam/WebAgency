"use client";

import { useEffect, useState } from "react";

export function MaquettesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/maquettes?statut=ATTENTE_VALIDATION&count=1")
      .then(r => r.json())
      .then(d => setCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
      {count}
    </span>
  );
}
