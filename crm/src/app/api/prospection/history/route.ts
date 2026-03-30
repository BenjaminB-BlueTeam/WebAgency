import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const searches = await db.recherche.findMany({
      orderBy: { date: "desc" },
      take: 10,
      select: {
        id: true,
        query: true,
        resultatsCount: true,
        prospectsAjoutes: true,
        date: true,
      },
    });
    return NextResponse.json(searches, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[history] DB error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
