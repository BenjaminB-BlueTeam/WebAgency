import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const ALLOWED_STATUTS = ["BROUILLON", "ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const devis = await db.devis.findUnique({
    where: { id },
    include: { prospect: true },
  });

  if (!devis) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(devis);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.statut !== undefined) {
    if (!ALLOWED_STATUTS.includes(body.statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    data.statut = body.statut;
    if (body.statut === "ENVOYE") data.dateEnvoi = new Date();
    if (body.statut === "ACCEPTE") data.dateAcceptation = new Date();
  }
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 1000);
  if (body.offre !== undefined) data.offre = String(body.offre).slice(0, 200);

  const devis = await db.devis.update({ where: { id }, data });
  return NextResponse.json(devis);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  await db.devis.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
