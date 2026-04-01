import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      maquettes: true,
      devis: true,
      activites: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  if (!prospect) {
    return NextResponse.json(
      { error: "Prospect non trouvé" },
      { status: 404 }
    );
  }

  // Résumé des échanges (5 dernières activités pertinentes)
  const activitesEchanges = prospect.activites
    .filter((a) =>
      ["EMAIL_ENVOYE", "EMAIL_RECU", "NOTE"].includes(a.type)
    )
    .slice(0, 5);

  let resumeEchanges = "Aucun échange enregistré.";
  if (activitesEchanges.length > 0) {
    const lignes = activitesEchanges.map(
      (a) =>
        `${a.date.toLocaleDateString("fr-FR")} — ${a.type.replace("_", " ").toLowerCase()} : ${a.description ?? "—"}`
    );
    resumeEchanges = lignes.join(" | ");
  }

  return NextResponse.json({ ...prospect, resumeEchanges });
}

const pipelineDateFields: Record<string, string> = {
  CONTACTE: "dateContact",
  RDV: "dateRdv",
  DEVIS: "dateDevis",
  SIGNE: "dateSignature",
  LIVRE: "dateLivraison",
};

// A05 — Mass assignment: only allow known updatable fields
const ALLOWED_PATCH_FIELDS = new Set([
  "nom",
  "activite",
  "ville",
  "telephone",
  "email",
  "siteUrl",
  "adresse",
  "noteGoogle",
  "statut",
  "priorite",
  "raison",
  "argumentCommercial",
  "statutPipeline",
  "notes",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const existing = await db.prospect.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Prospect non trouvé" },
      { status: 404 }
    );
  }

  // Only pick explicitly allowed fields from the request body
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (key in body) data[key] = body[key];
  }

  // Auto-set date fields on pipeline status change
  if (body.statutPipeline && body.statutPipeline !== existing.statutPipeline) {
    const dateField = pipelineDateFields[body.statutPipeline];
    if (dateField) {
      data[dateField] = new Date();
    }
  }

  const prospect = await db.prospect.update({
    where: { id },
    data,
  });

  // Log pipeline change as activity
  if (body.statutPipeline && body.statutPipeline !== existing.statutPipeline) {
    await db.activite.create({
      data: {
        prospectId: id,
        type: "NOTE",
        description: `Pipeline: ${existing.statutPipeline} → ${body.statutPipeline}`,
      },
    });
  }

  return NextResponse.json(prospect);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const existing = await db.prospect.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Prospect non trouvé" },
      { status: 404 }
    );
  }

  await db.prospect.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
