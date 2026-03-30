import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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
  return NextResponse.json(searches);
}
