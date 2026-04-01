import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const SEUILS = [2, 5, 10, 21]; // jours

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const now = new Date();
  const prospects = await db.prospect.findMany({
    where: {
      statutPipeline: { in: ["CONTACTE", "PROSPECT"] },
      dateContact: { not: null },
    },
  });

  const aRelancer = prospects
    .filter((p) => {
      if (!p.dateContact) return false;
      const joursEcoules = Math.floor(
        (now.getTime() - p.dateContact.getTime()) / 86400000
      );
      return SEUILS.includes(joursEcoules);
    })
    .map((p) => {
      const joursEcoules = Math.floor(
        (now.getTime() - p.dateContact!.getTime()) / 86400000
      );
      return {
        id: p.id,
        nom: p.nom,
        ville: p.ville,
        telephone: p.telephone,
        email: p.email,
        joursDepuisContact: joursEcoules,
        statutPipeline: p.statutPipeline,
        messageRelance: `Relance J+${joursEcoules} pour ${p.nom} (${p.ville})`,
      };
    });

  return NextResponse.json({ count: aRelancer.length, prospects: aRelancer });
}
