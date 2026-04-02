import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");
  const countOnly = searchParams.get("count") === "1";

  if (countOnly && statut) {
    const count = await db.maquette.count({ where: { statut } });
    return NextResponse.json({ count });
  }

  const maquettes = await db.maquette.findMany({
    where: statut ? { statut } : undefined,
    include: { prospect: { select: { id: true, nom: true, ville: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(maquettes);
}
