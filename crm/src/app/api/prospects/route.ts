import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut");
  const priorite = searchParams.get("priorite");
  const pipeline = searchParams.get("pipeline");
  const q = searchParams.get("q")?.slice(0, 200) ?? null;

  const where: Record<string, unknown> = {};

  if (statut) where.statut = statut;
  if (priorite) where.priorite = priorite;
  if (pipeline) where.statutPipeline = pipeline;

  if (q) {
    where.OR = [
      { nom: { contains: q } },
      { ville: { contains: q } },
      { activite: { contains: q } },
    ];
  }

  const prospects = await db.prospect.findMany({
    where,
    include: {
      maquettes: { select: { id: true, statut: true, demoUrl: true } },
      _count: { select: { activites: true, devis: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(prospects);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();

  const {
    nom,
    activite,
    ville,
    telephone,
    email,
    siteUrl,
    statut = "SANS_SITE",
    priorite = "MOYENNE",
    raison,
    argumentCommercial,
    source = "MANUEL",
    adresse,
    noteGoogle,
  } = body;

  if (!nom || !activite || !ville) {
    return NextResponse.json(
      { error: "nom, activite et ville sont requis" },
      { status: 400 }
    );
  }

  if (siteUrl && !/^https?:\/\//.test(String(siteUrl))) {
    return NextResponse.json({ error: "siteUrl invalide" }, { status: 400 });
  }

  const prospect = await db.prospect.create({
    data: {
      nom,
      activite,
      ville,
      telephone,
      email,
      siteUrl,
      statut,
      priorite,
      raison,
      argumentCommercial,
      source,
      adresse: adresse ? String(adresse).slice(0, 300) : null,
      noteGoogle: noteGoogle != null ? (isNaN(parseFloat(noteGoogle)) ? null : parseFloat(noteGoogle)) : null,
    },
  });

  await db.activite.create({
    data: {
      prospectId: prospect.id,
      type: "NOTE",
      description: `Prospect ajouté (${source})`,
    },
  });

  return NextResponse.json(prospect, { status: 201 });
}
