// crm/src/app/api/prospects/[id]/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmailPrompt } from "@/lib/prompts/email";
import { execFileSync } from "child_process";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  // H-02: Validation stricte de l'id
  if (!id || typeof id !== "string" || !/^[a-z0-9]+$/i.test(id)) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }

  try {
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        maquettes: {
          select: { demoUrl: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }

    // Fetch Benjamin's contact info from Parametre
    const [telParam, emailParam] = await Promise.all([
      db.parametre.findUnique({ where: { cle: "profil_telephone" } }),
      db.parametre.findUnique({ where: { cle: "profil_email" } }),
    ]);

    const demoUrl = prospect.maquettes[0]?.demoUrl ?? null;

    const prompt = getEmailPrompt({
      nom: prospect.nom,
      activite: prospect.activite,
      ville: prospect.ville,
      statut: prospect.statut,
      argumentCommercial: prospect.argumentCommercial,
      telephone: prospect.telephone,
      siteUrl: prospect.siteUrl,
      demoUrl,
      benjaminTel: telParam?.valeur ?? null,
      benjaminEmail: emailParam?.valeur ?? null,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (response.content.find(b => b.type === "text")?.text ?? "").trim();
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: { sujet?: string; corps?: string } | null = null;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch { /* */ } }
    }

    if (!parsed?.sujet || !parsed?.corps) {
      return NextResponse.json({ error: "Génération email échouée" }, { status: 500 });
    }

    const body = await request.clone().json().catch(() => ({}));

    // Envoi réel via himalaya si send: true
    if (body.send === true) {
      // H-02: Validation email + execFileSync au lieu de execSync
      const destinataire = prospect.email ?? "";
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(destinataire)) {
        return NextResponse.json({ error: "Email prospect invalide" }, { status: 400 });
      }

      const emailContent = `From: contact@flandre-web.fr\nTo: ${destinataire}\nSubject: ${parsed.sujet}\n\n${parsed.corps}`;

      try {
        execFileSync("himalaya", ["send"], {
          input: emailContent,
          env: { ...process.env, HOME: "/root" },
          timeout: 15000,
        });

        // Logger dans le CRM
        await db.activite.create({
          data: {
            prospectId: id,
            type: "EMAIL_ENVOYE",
            description: `Email envoyé : ${parsed.sujet}`,
          },
        });
        await db.prospect.update({
          where: { id },
          data: { dateContact: new Date(), statutPipeline: "CONTACTE" },
        });

        return NextResponse.json({
          sujet: parsed.sujet,
          corps: parsed.corps,
          sent: true,
        });
      } catch (err) {
        return NextResponse.json(
          { error: "Envoi himalaya échoué", details: String(err) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ sujet: parsed.sujet, corps: parsed.corps });
  } catch (err) {
    console.error("[prospects/email]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
