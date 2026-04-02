// crm/src/app/api/prospects/[id]/analyse-stream/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { anthropic } from "@/lib/anthropic";
import { scrapeUrl } from "@/lib/scrape";
import { placesTextSearch, placesDetails } from "@/lib/places";
import { getAnalysePrompt, type AnalyseResult } from "@/lib/prompts/analyse";

export const maxDuration = 300;

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { id } = await params;
  if (!id || id.length > 100) {
    return new Response("id invalide", { status: 400 });
  }

  const prospect = await db.prospect.findUnique({ where: { id } });
  if (!prospect) return new Response("Not found", { status: 404 });

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(new TextEncoder().encode(sseEvent(data)));
      }

      try {
        // Step 1: scrape prospect site
        let siteContent = "";
        if (prospect.siteUrl) {
          send({ step: "Scraping du site prospect…", done: false });
          siteContent = await scrapeUrl(prospect.siteUrl);
        }

        // Step 2: find competitors via Google Places
        send({ step: "Recherche des concurrents…", done: false });
        const query = `${prospect.activite} ${prospect.ville}`;
        const places = await placesTextSearch(query);

        // Filter: exclude the prospect itself, take top 5
        const competitorPlaces = places
          .filter(p => p.name.toLowerCase() !== prospect.nom.toLowerCase())
          .slice(0, 5);

        // Step 3: scrape competitor sites
        send({ step: "Analyse des sites concurrents…", done: false });
        const concurrents = await Promise.all(
          competitorPlaces.slice(0, 3).map(async p => {
            const details = await placesDetails(p.place_id);
            let competitorSiteContent = "";
            if (details?.website) {
              competitorSiteContent = await scrapeUrl(details.website);
            }
            return {
              nom: p.name,
              url: details?.website ?? "",
              noteGoogle: details?.rating ?? p.rating,
              nbAvis: undefined as number | undefined,
              siteContent: competitorSiteContent,
            };
          })
        );

        // Step 4: Claude analysis
        send({ step: "Analyse marketing en cours…", done: false });
        const prompt = getAnalysePrompt({
          prospect: {
            nom: prospect.nom,
            activite: prospect.activite,
            ville: prospect.ville,
            statut: prospect.statut,
            noteGoogle: prospect.noteGoogle,
            nbAvisGoogle: prospect.nbAvisGoogle,
            siteUrl: prospect.siteUrl,
            siteContent,
          },
          concurrents,
        });

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        });

        const raw = response.content.find(b => b.type === "text")?.text ?? "{}";
        let rapport: AnalyseResult;
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        try {
          rapport = JSON.parse(cleaned);
        } catch {
          // Try extracting the JSON object from surrounding text
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (!match) {
            send({ error: "Parse JSON échoué — aucun objet JSON trouvé", raw: raw.slice(0, 300), done: true });
            controller.close();
            return;
          }
          try {
            rapport = JSON.parse(match[0]);
          } catch {
            // Fix trailing commas and retry
            const fixed = match[0].replace(/,\s*([}\]])/g, "$1");
            try {
              rapport = JSON.parse(fixed);
            } catch {
              send({ error: "Parse JSON échoué", raw: match[0].slice(0, 300), done: true });
              controller.close();
              return;
            }
          }
        }

        // Persist in DB
        const existingNotes = prospect.notes
          ? (() => { try { return JSON.parse(prospect.notes as string); } catch { return {}; } })()
          : {};

        await db.prospect.update({
          where: { id },
          data: {
            notes: JSON.stringify({
              ...existingNotes,
              analyse_concurrentielle: rapport,
              analyse_date: new Date().toISOString(),
            }),
          },
        });

        await db.activite.create({
          data: {
            prospectId: id,
            type: "ANALYSE",
            description: "Analyse concurrentielle approfondie (SSE)",
          },
        });

        send({ rapport, done: true });
      } catch (err) {
        send({ error: String(err), done: true });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
