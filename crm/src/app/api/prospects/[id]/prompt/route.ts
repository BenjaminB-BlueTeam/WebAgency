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
      notes: true,
    },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  }

  const d = getDesignDirection(prospect.activite);
  let prompt = getUserPrompt(prospect, d);

  // Enrichissement analyse concurrentielle
  if (prospect.notes) {
    try {
      const notes = JSON.parse(prospect.notes as string);
      const analyse = notes.analyse_concurrentielle;
      if (analyse?.prompt_maquette_enrichi) {
        prompt += `\n\n--- ANALYSE CONCURRENTIELLE ---\n${analyse.prompt_maquette_enrichi}`;
      }
      if (analyse?.argumentaire?.arguments_chocs?.length) {
        prompt += `\n\nARGUMENTS DIFFÉRENCIANTS : ${analyse.argumentaire.arguments_chocs.join(" | ")}`;
      }
      if (analyse?.opportunites_differenciation?.length) {
        prompt += `\n\nOPPORTUNITÉS : ${analyse.opportunites_differenciation.join(", ")}`;
      }
      // Inject prospect feedback if available (for regeneration)
      if (notes.dernier_feedback_prospect) {
        prompt += `\n\n--- RETOURS DU PROSPECT ---\n${notes.dernier_feedback_prospect}\nAdapte la maquette en tenant compte de ces retours spécifiques.`;
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({ prompt });
}
