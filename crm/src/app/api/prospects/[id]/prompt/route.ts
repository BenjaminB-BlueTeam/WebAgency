// crm/src/app/api/prospects/[id]/prompt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDesignDirection } from "@/lib/design-direction";
import { getUserPrompt } from "@/lib/prompts/maquette";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 100) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }

  const prospect = await db.prospect.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      activite: true,
      ville: true,
      telephone: true,
      email: true,
      siteUrl: true,
      statut: true,
      argumentCommercial: true,
    },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  }

  const d = getDesignDirection(prospect.activite);
  const prompt = getUserPrompt(prospect, d);

  return NextResponse.json({ prompt });
}
