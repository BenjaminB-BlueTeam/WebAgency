"use client";

import { LayoutProvider, useLayout } from "@/components/layout/layout-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useLayout();

  return (
    <div
      className="flex flex-1 flex-col transition-[margin-left] duration-200 ease-in-out"
      style={{ marginLeft: collapsed ? 64 : 240 }}
    >
      <Topbar />
      <main className="flex-1 p-6">{children}</main>
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
