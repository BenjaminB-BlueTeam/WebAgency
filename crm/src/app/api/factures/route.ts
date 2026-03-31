import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function genRef() {
  const now = new Date();
  return `FAC-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const factures = await db.facture.findMany({
    include: {
      prospect: { select: { id: true, nom: true, ville: true } },
      devis: { select: { id: true, reference: true, offre: true } },
    },
    orderBy: { dateCreation: "desc" },
  });

  return NextResponse.json(factures);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { prospectId, devisId, montantHT, notes, echeanceJours = 30 } = body;

  if (!prospectId || montantHT == null) {
    return NextResponse.json({ error: "prospectId et montantHT sont requis" }, { status: 400 });
  }

  const ht = parseFloat(montantHT);
  if (isNaN(ht) || ht <= 0) {
    return NextResponse.json({ error: "montantHT invalide" }, { status: 400 });
  }

  const ttc = Math.round(ht * 1.2 * 100) / 100;
  const echeance = new Date();
  echeance.setDate(echeance.getDate() + echeanceJours);

  const facture = await db.facture.create({
    data: {
      prospectId,
      devisId: devisId || null,
      montantHT: ht,
      montantTTC: ttc,
      reference: genRef(),
      dateEcheance: echeance,
      notes: notes ? String(notes).slice(0, 1000) : null,
    },
    include: {
      prospect: { select: { id: true, nom: true, ville: true } },
      devis: { select: { id: true, reference: true, offre: true } },
    },
  });

  await db.activite.create({
    data: {
      prospectId,
      type: "FACTURE",
      description: `Facture ${facture.reference} créée — ${ht}€ HT`,
    },
  });

  return NextResponse.json(facture, { status: 201 });
}
