import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function genRef() {
  const now = new Date();
  return `DEV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const devis = await db.devis.findMany({
    include: {
      prospect: { select: { id: true, nom: true, ville: true, activite: true } },
    },
    orderBy: { dateCreation: "desc" },
  });

  return NextResponse.json(devis);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { prospectId, offre, montantHT, lignes = "[]", validiteJours = 30, notes } = body;

  if (!prospectId || !offre || montantHT == null) {
    return NextResponse.json({ error: "prospectId, offre et montantHT sont requis" }, { status: 400 });
  }

  const ht = parseFloat(montantHT);
  if (isNaN(ht) || ht < 0) {
    return NextResponse.json({ error: "montantHT invalide" }, { status: 400 });
  }

  const ttc = Math.round(ht * 1.2 * 100) / 100;
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + validiteJours);

  const devis = await db.devis.create({
    data: {
      prospectId,
      offre: String(offre).slice(0, 200),
      montantHT: ht,
      montantTTC: ttc,
      lignes: String(lignes),
      reference: genRef(),
      validiteJours,
      dateExpiration: expiration,
      notes: notes ? String(notes).slice(0, 1000) : null,
    },
    include: {
      prospect: { select: { id: true, nom: true, ville: true } },
    },
  });

  await db.activite.create({
    data: {
      prospectId,
      type: "DEVIS",
      description: `Devis ${devis.reference} créé — ${ht}€ HT`,
    },
  });

  return NextResponse.json(devis, { status: 201 });
}
