"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "./layout-provider";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function SidebarItem({ href, icon: Icon, label }: SidebarItemProps) {
  const pathname = usePathname();
  const { collapsed } = useLayout();

  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  const classes = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
    isActive
      ? "bg-[hsl(var(--sidebar-primary))]/15 text-[hsl(var(--sidebar-primary))]"
      : "text-[hsl(var(--sidebar-foreground))]/60 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
  } ${collapsed ? "justify-center px-0" : ""}`;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link href={href} className={classes}>
              <Icon className="size-5 shrink-0" />
            </Link>
          }
        />
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} className={classes}>
      <Icon className="size-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
