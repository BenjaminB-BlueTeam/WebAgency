import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const maquette = await db.maquette.findUnique({
    where: { id },
    select: { htmlPath: true, demoUrl: true },
  });

  if (!maquette) {
    return new NextResponse("Not found", { status: 404 });
  }

  // 1. Try local htmlPath first
  if (maquette.htmlPath) {
    try {
      const resolved = path.isAbsolute(maquette.htmlPath)
        ? maquette.htmlPath
        : path.resolve(process.cwd(), "..", maquette.htmlPath);
      const html = await fs.readFile(resolved, "utf8");
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      // fall through
    }
  }

  // 2. Try proxying demoUrl
  if (maquette.demoUrl) {
    try {
      const res = await fetch(maquette.demoUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const html = await res.text();
        return new NextResponse(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    } catch {
      // fall through
    }
  }

  return new NextResponse("No preview available", { status: 404 });
}
