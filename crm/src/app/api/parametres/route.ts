import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// A05 — Allowlist: only these keys can be written via the API
const ALLOWED_PARAM_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "NETLIFY_TOKEN",
  "GOOGLE_PLACES_KEY",
  "FIRECRAWL_KEY",
  "crm_titre",
  "crm_contact_email",
  "crm_contact_telephone",
]);

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const params = await db.parametre.findMany();
  const result: Record<string, string> = {};
  for (const p of params) result[p.cle] = p.valeur;
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await request.json();

    for (const [cle, valeur] of Object.entries(data)) {
      // Reject keys not in the allowlist
      if (!ALLOWED_PARAM_KEYS.has(cle)) {
        return NextResponse.json(
          { error: `Clé non autorisée : ${cle}` },
          { status: 400 }
        );
      }
      // Reject values that are not strings or are too long
      if (typeof valeur !== "string" || valeur.length > 500) {
        return NextResponse.json(
          { error: `Valeur invalide pour la clé : ${cle}` },
          { status: 400 }
        );
      }
      await db.parametre.upsert({
        where: { cle },
        update: { valeur: String(valeur) },
        create: { cle, valeur: String(valeur) },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des paramètres" },
      { status: 500 }
    );
  }
}
