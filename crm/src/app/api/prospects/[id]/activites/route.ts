import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { avancerPipeline } from "@/lib/pipeline";

const VALID_TYPES = [
  "APPEL",
  "EMAIL",
  "SMS",
  "VISITE",
  "RDV",
  "MAQUETTE",
  "DEVIS",
  "FACTURE",
  "NOTE",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const body = await request.json();
    const { type, description } = body;

    if (!type || !description) {
      return NextResponse.json(
        { error: "type et description sont requis" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type invalide. Valeurs acceptées: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const prospect = await db.prospect.findUnique({ where: { id } });
    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect non trouvé" },
        { status: 404 }
      );
    }

    const activite = await db.activite.create({
      data: {
        prospectId: id,
        type,
        description,
      },
    });

    if (type === "RDV") {
      await avancerPipeline(id, "RDV");
    }

    return NextResponse.json(activite, { status: 201 });
  } catch (err) {
    console.error("[activites POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
