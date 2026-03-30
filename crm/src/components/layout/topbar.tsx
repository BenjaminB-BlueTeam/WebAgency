"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Tableau de bord",
  "/prospects": "Prospects",
  "/clients": "Clients",
  "/maquettes": "Maquettes",
  "/prospection": "Prospection",
  "/devis": "Devis",
  "/factures": "Factures",
  "/parametres": "Paramètres",
};

export function Topbar() {
  const pathname = usePathname();

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => key !== "/" && pathname.startsWith(key))?.[1] ??
    "WebAgency CRM";

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border px-6">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
    </header>
  );
}
