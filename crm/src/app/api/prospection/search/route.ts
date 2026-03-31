// crm/src/app/api/prospection/search/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { placesTextSearch, placesDetails } from "@/lib/places";
import { db } from "@/lib/db";

const MAX_PLACES = 10;

export interface SearchProspect {
  nom: string;
  activite: string;
  ville: string;
  telephone: string | null;
  email: string | null;
  siteUrl: string | null;
  adresse: string | null;
  noteGoogle: number | null;
  statut: string;
  priorite: string;
  raison: string | null;
  argumentCommercial: string | null;
  alreadyInCrm: boolean;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q || q.length > 200) {
    return new Response(JSON.stringify({ error: "q requis, max 200 chars" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Step 1: Google Places
        send({ type: "status", step: "places", message: "Recherche Google Places..." });
        const places = await placesTextSearch(q);
        if (!places.length) {
          send({ type: "error", message: "Aucun résultat Google Places pour cette requête." });
          return;
        }

        send({ type: "status", step: "places", message: `${places.length} entreprises trouvées — enrichissement...` });

        // Step 2: Details enrichment (batches of 3)
        const enriched: Array<{
          nom: string;
          adresse: string;
          rating: number | null;
          telephone: string | null;
          website: string | null;
          types: string[];
        }> = [];
        const toProcess = places.slice(0, MAX_PLACES);
        for (let i = 0; i < toProcess.length; i += 3) {
          const batch = toProcess.slice(i, i + 3);
          const results = await Promise.all(
            batch.map(async (place) => {
              const details = await placesDetails(place.place_id);
              return {
                nom: place.name,
                adresse: place.formatted_address,
                rating: place.rating ?? null,
                telephone: details?.formatted_phone_number ?? null,
                website: details?.website ?? null,
                types: place.types,
              };
            })
          );
          enriched.push(...results);
          send({
            type: "status",
            step: "details",
            message: `Enrichissement ${Math.min(i + 3, toProcess.length)}/${toProcess.length}...`,
          });
        }

        // Step 3: Claude classification
        send({ type: "status", step: "analyse", message: "Analyse IA en cours..." });

        if (!process.env.ANTHROPIC_API_KEY) {
          send({ type: "error", message: "Configuration serveur manquante." });
          return;
        }
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: `Expert commercial en vente de sites web aux TPE/artisans locaux France, secteur Steenvoorde (Nord).
Statuts : SANS_SITE (aucune URL propre), SITE_OBSOLETE (HTTP / design pré-2018 / non-mobile détectable dans le contenu), SITE_BASIQUE (site présent mais incomplet), SITE_CORRECT (ne pas inclure — pas de valeur commerciale).
Réponds UNIQUEMENT en JSON valide, sans markdown.`,
          messages: [{
            role: "user",
            content: `Voici les entreprises trouvées via Google Places pour la requête "${q}" dans la région Steenvoorde/Nord.
Pour chaque entreprise, détermine son statut web, sa priorité commerciale et génère un argument d'accroche personnalisé.
Ignore SITE_CORRECT (aucune valeur commerciale pour nous).

DONNÉES BRUTES :
${JSON.stringify(enriched, null, 2).slice(0, 8000)}

Réponds UNIQUEMENT en JSON valide :
{
  "prospects": [{
    "nom": "...",
    "activite": "type d'activité précis",
    "ville": "...",
    "telephone": "0X XX XX XX XX ou null",
    "email": "... ou null",
    "site_url": "URL ou null",
    "adresse": "adresse complète",
    "noteGoogle": 4.2,
    "statut": "SANS_SITE|SITE_OBSOLETE|SITE_BASIQUE",
    "priorite": "HAUTE|MOYENNE|FAIBLE",
    "raison": "explication courte du statut",
    "argument_commercial": "phrase d'accroche personnalisée"
  }]
}`,
          }],
        });

        const text = response.content.find(b => b.type === "text")?.text ?? "";
        const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let parsed: { prospects?: Array<{
          nom: string; activite: string; ville: string;
          telephone?: string | null; email?: string | null;
          site_url?: string | null; adresse?: string | null;
          noteGoogle?: number | null; statut: string; priorite: string;
          raison?: string | null; argument_commercial?: string | null;
        }> } | null = null;

        try {
          parsed = JSON.parse(clean);
        } catch {
          const match = clean.match(/\{[\s\S]*\}/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch { /* */ }
          }
        }

        if (!parsed?.prospects?.length) {
          send({ type: "error", message: "Impossible de parser la réponse Claude." });
          return;
        }

        // Step 4: Check which are already in CRM, emit each result
        let emitCount = 0;
        for (const p of parsed.prospects) {
          if (!p.nom || !p.ville) continue;
          const existing = await db.prospect.findFirst({
            where: { nom: p.nom, ville: p.ville },
            select: { id: true },
          });
          const prospect: SearchProspect = {
            nom: p.nom,
            activite: p.activite ?? q,
            ville: p.ville,
            telephone: p.telephone ?? null,
            email: p.email ?? null,
            siteUrl: p.site_url ?? null,
            adresse: p.adresse ?? null,
            noteGoogle: p.noteGoogle ?? null,
            statut: p.statut,
            priorite: p.priorite,
            raison: p.raison ?? null,
            argumentCommercial: p.argument_commercial ?? null,
            alreadyInCrm: !!existing,
          };
          send({ type: "prospect", ...prospect });
          emitCount++;
        }

        // Save to Recherche history
        try {
          await db.recherche.create({
            data: {
              query: q,
              resultatsCount: emitCount,
              prospectsAjoutes: 0,
              date: new Date(),
            },
          });
        } catch (dbErr) {
          console.error("[prospection/search] recherche.create failed:", dbErr);
        }

      } catch (err) {
        console.error("[prospection/search]", err);
        send({ type: "error", message: "Erreur lors de la recherche. Réessayez." });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
