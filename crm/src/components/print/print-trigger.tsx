"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    // Small delay to ensure styles are loaded
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return null;
}
