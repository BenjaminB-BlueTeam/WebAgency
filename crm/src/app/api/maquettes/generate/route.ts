// crm/src/app/api/maquettes/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { prospectId, customPrompt } = body;

    if (!prospectId || typeof prospectId !== "string") {
      return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
    }

    if (customPrompt !== undefined && (typeof customPrompt !== "string" || customPrompt.length > 20000)) {
      return NextResponse.json({ error: "customPrompt invalide" }, { status: 400 });
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
    const user = customPrompt?.trim() ? customPrompt.trim() : getUserPrompt(prospect, d);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
    });

    let html = (response.content.find(b => b.type === "text")?.text ?? "").trim();
    // Strip leading markdown code fences / preamble
    if (!html.startsWith("<!")) {
      const idx = html.indexOf("<!DOCTYPE");
      if (idx > 0) html = html.slice(idx);
    }
    // Strip trailing markdown code fences (``` or ```html)
    html = html.replace(/\n?```\s*$/, "").trim();

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
    // find-first pattern: avoids requiring @@unique([prospectId, type])
    const maquette = await db.maquette.upsert({
      where: {
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
  } catch (err) {
    console.error("[maquettes/generate]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
