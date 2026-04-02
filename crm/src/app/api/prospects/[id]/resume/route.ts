// crm/src/app/api/prospects/[id]/resume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { anthropic } from "@/lib/anthropic";

export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { id } = await params;

  const prospect = await db.prospect.findUnique({
    where: { id },
    select: {
      nom: true,
      statutPipeline: true,
      activites: {
        orderBy: { date: "desc" },
        take: 20,
        select: { type: true, description: true, date: true },
      },
      maquettes: {
        orderBy: { createdAt: "desc" },
        select: { version: true, statut: true, demoUrl: true, retourClient: true, createdAt: true },
      },
    },
  });

  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (prospect.activites.length === 0) {
    return NextResponse.json({ resume: null });
  }

  const activitesText = prospect.activites
    .map(a => `${new Date(a.date).toLocaleDateString("fr-FR")} [${a.type}] ${a.description}`)
    .join("\n");

  const maquettesText = prospect.maquettes
    .map(m => `Maquette v${m.version ?? 1} (${m.statut}) — ${m.retourClient ? `Feedback: ${m.retourClient}` : ""}`)
    .join("\n");

  const prompt = `Tu es un assistant CRM. Génère un résumé factuel et chronologique des échanges avec ce prospect en 3-5 phrases maximum. Ton neutre, sans fioritures.

Prospect : ${prospect.nom} — Pipeline : ${prospect.statutPipeline}

Activités :
${activitesText}

${maquettesText ? `Maquettes :\n${maquettesText}` : ""}

Résumé (3-5 phrases) :`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const resume = response.content.find(b => b.type === "text")?.text?.trim() ?? null;
  return NextResponse.json({ resume });
}
