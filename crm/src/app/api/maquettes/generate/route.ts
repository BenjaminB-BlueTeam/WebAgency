// crm/src/app/api/maquettes/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDesignDirection } from "@/lib/design-direction";
import { getSystemPrompt, getUserPrompt } from "@/lib/prompts/maquette";
import { deployToNetlify } from "@/lib/netlify-deploy";

// Allow up to 5 minutes (Vercel Pro). Hobby plan caps at 60s.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { prospectId } = body;

  if (!prospectId || typeof prospectId !== "string") {
    return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
  }

  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
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

  // Generate HTML via Claude
  const d = getDesignDirection(prospect.activite);
  const system = getSystemPrompt();
  const user = getUserPrompt(prospect, d);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
  });

  let html = (response.content.find(b => b.type === "text")?.text ?? "").trim();
  if (!html.startsWith("<!")) {
    // Claude may have added a preamble — strip it
    const idx = html.indexOf("<!DOCTYPE");
    if (idx > 0) html = html.slice(idx);
  }

  if (!html) {
    return NextResponse.json({ error: "Génération HTML échouée" }, { status: 500 });
  }

  // Deploy to Netlify
  let demoUrl: string | null = null;
  let netlifySiteId: string | null = null;
  try {
    const deployed = await deployToNetlify(html, prospect.nom, prospect.ville);
    demoUrl = deployed.url;
    netlifySiteId = deployed.siteId;
  } catch (err) {
    console.error("[maquettes/generate] Netlify deploy failed:", err);
    // Continue without demo URL — HTML is saved in DB
  }

  // Save to DB (upsert: one maquette per prospect for simplicity)
  const maquette = await db.maquette.upsert({
    where: {
      // Need a unique constraint — see note below
      id: (await db.maquette.findFirst({
        where: { prospectId, type: "html" },
        select: { id: true },
      }))?.id ?? "new-does-not-exist",
    },
    create: {
      prospectId,
      type: "html",
      html,
      demoUrl,
      netlifySiteId,
      statut: demoUrl ? "ENVOYE" : "BROUILLON",
    },
    update: {
      html,
      demoUrl,
      netlifySiteId,
      statut: demoUrl ? "ENVOYE" : "BROUILLON",
      updatedAt: new Date(),
    },
  });

  // Log activity
  await db.activite.create({
    data: {
      prospectId,
      type: "NOTE",
      description: `Maquette générée${demoUrl ? ` — démo : ${demoUrl}` : " (sans déploiement Netlify)"}`,
    },
  });

  return NextResponse.json({
    id: maquette.id,
    demoUrl: maquette.demoUrl,
    statut: maquette.statut,
    prospectId,
  });
}
