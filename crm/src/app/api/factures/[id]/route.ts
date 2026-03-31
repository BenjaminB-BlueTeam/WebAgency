import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const ALLOWED_STATUTS = ["EN_ATTENTE", "PARTIELLEMENT_PAYEE", "PAYEE", "RETARD", "ANNULEE"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const facture = await db.facture.findUnique({
    where: { id },
    include: { prospect: true, devis: true },
  });

  if (!facture) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(facture);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const existing = await db.facture.findUnique({ where: { id }, select: { montantTTC: true } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.statut !== undefined) {
    if (!ALLOWED_STATUTS.includes(body.statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    data.statut = body.statut;
    if (body.statut === "PAYEE") data.datePaiement = new Date();
  }
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 1000);
  if (body.montantAcompte !== undefined) {
    const acompte = parseFloat(body.montantAcompte);
    if (!isNaN(acompte) && acompte > 0 && acompte <= existing.montantTTC) {
      data.montantAcompte = acompte;
      data.dateAcompte = new Date();
    } else if (!isNaN(acompte)) {
      return NextResponse.json(
        { error: "L'acompte doit être supérieur à 0 et inférieur ou égal au montant TTC" },
        { status: 400 }
      );
    }
  }

  const facture = await db.facture.update({ where: { id }, data });
  return NextResponse.json(facture);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  try {
    await db.facture.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
  }
}
