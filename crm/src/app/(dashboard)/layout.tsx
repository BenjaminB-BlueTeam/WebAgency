"use client";

import { LayoutProvider, useLayout } from "@/components/layout/layout-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useEffect, useState } from "react";

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useLayout();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      setIsMobile(e.matches);
    }
    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const marginLeft = isMobile ? 0 : collapsed ? 64 : 240;

  return (
    <div
      className="flex flex-1 flex-col transition-[margin-left] duration-200 ease-in-out"
      style={{ marginLeft }}
    >
      <Topbar />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </LayoutProvider>
  );
}
