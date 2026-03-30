"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface LayoutContextType {
  collapsed: boolean;
  toggle: () => void;
}

const LayoutContext = createContext<LayoutContextType>({
  collapsed: false,
  toggle: () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <LayoutContext.Provider value={{ collapsed, toggle }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
