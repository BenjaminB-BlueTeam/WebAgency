// crm/src/app/api/maquettes/[id]/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    action?: "valider" | "corriger";
    feedback?: string;
  };

  const { action, feedback } = body;
  if (!action || !["valider", "corriger"].includes(action)) {
    return NextResponse.json({ error: "action requise : valider | corriger" }, { status: 400 });
  }

  const maquette = await db.maquette.findUnique({
    where: { id },
    select: { id: true, prospectId: true, statut: true },
  });
  if (!maquette) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "valider") {
    await db.maquette.update({
      where: { id },
      data: { statut: "VALIDEE", dateValidation: new Date() },
    });
    await db.activite.create({
      data: {
        prospectId: maquette.prospectId,
        type: "NOTE",
        description: "Maquette validée",
      },
    });
    return NextResponse.json({ statut: "VALIDEE" });
  }

  // corriger
  if (!feedback || feedback.trim().length < 3) {
    return NextResponse.json({ error: "feedback requis" }, { status: 400 });
  }

  await db.maquette.update({
    where: { id },
    data: { statut: "A_CORRIGER", retourClient: feedback.trim() },
  });

  // Store feedback in prospect notes for next prompt generation
  const prospect = await db.prospect.findUnique({
    where: { id: maquette.prospectId },
    select: { notes: true },
  });
  const notes = prospect?.notes
    ? (() => { try { return JSON.parse(prospect.notes as string); } catch { return {}; } })()
    : {};
  await db.prospect.update({
    where: { id: maquette.prospectId },
    data: { notes: JSON.stringify({ ...notes, dernier_feedback_prospect: feedback.trim() }) },
  });

  await db.activite.create({
    data: {
      prospectId: maquette.prospectId,
      type: "NOTE",
      description: `Maquette refusée — corrections demandées : ${feedback.trim().slice(0, 100)}`,
    },
  });

  return NextResponse.json({ statut: "A_CORRIGER" });
}
