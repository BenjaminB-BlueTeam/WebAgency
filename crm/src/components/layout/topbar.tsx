"use client";

import { usePathname } from "next/navigation";
import { Menu, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLayout } from "./layout-provider";

const pageTitles: Record<string, string> = {
  "/": "Tableau de bord",
  "/prospects": "Prospects",
  "/clients": "Clients",
  "/maquettes": "Maquettes",
  "/prospection": "Prospection",
  "/devis": "Devis",
  "/factures": "Factures",
  "/analytics": "Analytics",
  "/parametres": "Paramètres",
};

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const matched = Object.entries(pageTitles).find(
    ([key]) => key !== "/" && pathname.startsWith(key)
  );
  if (!matched) return [{ label: pageTitles[pathname] ?? "WebAgency CRM", href: pathname }];

  const [parentHref, parentLabel] = matched;
  if (pathname === parentHref) return [{ label: parentLabel, href: parentHref }];

  return [
    { label: parentLabel, href: parentHref },
    { label: "Détail", href: pathname },
  ];
}

export function Topbar() {
  const pathname = usePathname();
  const { openMobile } = useLayout();

  const crumbs = getBreadcrumbs(pathname);
  const isNested = crumbs.length > 1;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <button
        onClick={openMobile}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </button>
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="size-3.5 text-muted-foreground/50" aria-hidden="true" />
              )}
              {isLast ? (
                <h1 className={`font-semibold tracking-tight ${isNested ? "text-base" : "text-lg"}`}>
                  {crumb.label}
                </h1>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </header>
  );
}
