import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const params = await db.parametre.findMany();
  const result: Record<string, string> = {};
  for (const p of params) result[p.cle] = p.valeur;
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    for (const [cle, valeur] of Object.entries(data)) {
      await db.parametre.upsert({
        where: { cle },
        update: { valeur: String(valeur) },
        create: { cle, valeur: String(valeur) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des param\u00e8tres" },
      { status: 500 }
    );
  }
}
