import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  return NextResponse.json(prospect);
}

const pipelineDateFields: Record<string, string> = {
  CONTACTE: "dateContact",
  RDV: "dateRdv",
  DEVIS: "dateDevis",
  SIGNE: "dateSignature",
  LIVRE: "dateLivraison",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await db.prospect.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Prospect non trouvé" },
      { status: 404 }
    );
  }

  const data: Record<string, unknown> = { ...body };

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
