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
      <div
        className="relative flex min-h-screen overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a0814 0%, #090b18 50%, #080d14 100%)",
        }}
      >
        {/* Ambient blob violet — haut droite */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed right-0 top-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)",
          }}
        />
        {/* Ambient blob bleu — bas gauche */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-0 left-60 h-96 w-96 translate-y-1/2"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)",
          }}
        />
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </LayoutProvider>
  );
}
