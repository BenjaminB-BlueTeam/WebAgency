"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useLayout } from "./layout-provider";

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
  const { openMobile } = useLayout();

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => key !== "/" && pathname.startsWith(key))?.[1] ??
    "WebAgency CRM";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <button
        onClick={openMobile}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </button>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
    </header>
  );
}
