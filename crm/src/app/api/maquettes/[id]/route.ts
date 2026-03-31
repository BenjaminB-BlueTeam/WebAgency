import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.statut !== undefined) data.statut = String(body.statut);
    if (body.retourClient !== undefined) data.retourClient = String(body.retourClient);

    const maquette = await db.maquette.update({
      where: { id },
      data,
    });

    return NextResponse.json(maquette);
  } catch {
    return NextResponse.json(
      { error: "Maquette non trouv\u00e9e ou erreur de mise \u00e0 jour" },
      { status: 404 }
    );
  }
}
