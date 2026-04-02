"use client";

import React from "react";
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
  badge?: React.ReactNode;
}

export function SidebarItem({ href, icon: Icon, label, badge }: SidebarItemProps) {
  const pathname = usePathname();
  const { collapsed, mobileOpen, closeMobile } = useLayout();

  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const isCollapsed = collapsed && !mobileOpen;

  const baseClasses =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200";

  const activeStyle = {
    background: "rgba(124,58,237,0.15)",
    border: "1px solid rgba(124,58,237,0.25)",
    boxShadow:
      "0 0 12px rgba(124,58,237,0.1), inset 0 1px 0 rgba(167,139,250,0.1)",
    color: "#a78bfa",
  };

  const inactiveClasses =
    "text-white/50 hover:text-white/90 hover:bg-white/5 border border-transparent";

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={href}
              className={`${baseClasses} justify-center px-0 ${isActive ? "" : inactiveClasses}`}
              style={isActive ? activeStyle : undefined}
              onClick={closeMobile}
            >
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
    <Link
      href={href}
      className={`${baseClasses} ${isActive ? "" : inactiveClasses}`}
      style={isActive ? activeStyle : undefined}
      onClick={closeMobile}
    >
      <Icon className="size-5 shrink-0" />
      <span>{label}</span>
      {badge}
    </Link>
  );
}
