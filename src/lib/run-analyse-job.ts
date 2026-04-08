import { prisma } from "@/lib/db"
import {
  findCompetitorCandidates,
  scrapeCompetitors,
  buildAnalyseResult,
  ANALYSE_SYSTEM_PROMPT,
} from "@/lib/analyse"
import {
  markJobRunning,
  markJobDone,
  markJobFailed,
  appendStep,
  updateStep,
} from "@/lib/analyse-job"

interface RunParams {
  jobId: string
  prospect: { id: string; nom: string; activite: string; ville: string; placeId: string | null }
}

export async function runAnalyseJob({ jobId, prospect }: RunParams): Promise<void> {
  try {
    await markJobRunning(jobId)

    // 1. search_competitors
    await appendStep(jobId, {
      nom: "search_competitors",
      statut: "running",
      message: "Recherche des concurrents dans un rayon de 20 km...",
    })
    const candidates = await findCompetitorCandidates(
      prospect.activite,
      prospect.ville,
      prospect.placeId
    )
    await updateStep(jobId, "search_competitors", {
      statut: "done",
      message: `${candidates.length} concurrent${candidates.length > 1 ? "s" : ""} trouvé${candidates.length > 1 ? "s" : ""}`,
      data: {
        count: candidates.length,
        competitors: candidates.map((c) => ({
          nom: c.nom,
          ville: prospect.ville,
          siteUrl: c.siteUrl,
        })),
      },
    })

    // 2. scrape_competitors with sub-steps
    await appendStep(jobId, {
      nom: "scrape_competitors",
      statut: "running",
      message: "Analyse des sites concurrents...",
    })
    const scraped = await scrapeCompetitors(candidates, {
      onStart: async (nom) => {
        await appendStep(jobId, {
          nom: `scrape_competitors:${nom}`,
          statut: "running",
          message: `Analyse du site de ${nom}...`,
        })
      },
      onSuccess: async (nom) => {
        await updateStep(jobId, `scrape_competitors:${nom}`, {
          statut: "done",
          message: "Site analysé",
        })
      },
      onFailure: async (nom) => {
        await updateStep(jobId, `scrape_competitors:${nom}`, {
          statut: "failed",
          message: "Site inaccessible — exclu de l'analyse",
        })
      },
      onNoWebsite: async (nom) => {
        await appendStep(jobId, {
          nom: `scrape_competitors:${nom}`,
          statut: "done",
          message: "Pas de site web",
        })
      },
    })
    const noSite = candidates.filter((c) => c.siteUrl === null)
    await updateStep(jobId, "scrape_competitors", {
      statut: "done",
      message: `${scraped.length} site${scraped.length > 1 ? "s" : ""} analysé${scraped.length > 1 ? "s" : ""}`,
      data: {
        analysed: scraped.map((s) => s.nom),
        failed: candidates
          .filter((c) => c.siteUrl !== null && !scraped.some((s) => s.nom === c.nom))
          .map((c) => c.nom),
        noWebsite: noSite.map((c) => c.nom),
      },
    })

    // 3. analyse
    await appendStep(jobId, {
      nom: "analyse",
      statut: "running",
      message: "Analyse croisée des concurrents...",
    })
    const result = await buildAnalyseResult(prospect, scraped, noSite)
    await updateStep(jobId, "analyse", {
      statut: "done",
      message: "Forces et faiblesses identifiées",
    })

    // 4. recommandations (cosmetic step — same Claude call)
    await appendStep(jobId, {
      nom: "recommandations",
      statut: "running",
      message: "Génération des recommandations stratégiques...",
    })
    await updateStep(jobId, "recommandations", {
      statut: "done",
      message: "Analyse terminée",
    })

    // Persist Analyse + Activite (same as legacy route)
    const concurrents = JSON.stringify(result.concurrents)
    const recommandations = JSON.stringify({
      synthese: result.synthese,
      points: result.recommandations,
    })
    await prisma.analyse.upsert({
      where: { prospectId: prospect.id },
      create: {
        prospectId: prospect.id,
        concurrents,
        recommandations,
        promptUsed: ANALYSE_SYSTEM_PROMPT,
      },
      update: {
        concurrents,
        recommandations,
        promptUsed: ANALYSE_SYSTEM_PROMPT,
        createdAt: new Date(),
      },
    })
    await prisma.activite.create({
      data: {
        prospectId: prospect.id,
        type: "ANALYSE",
        description: `Analyse concurrentielle effectuée (${result.concurrents.length} concurrent${result.concurrents.length > 1 ? "s" : ""})`,
      },
    })

    await markJobDone(jobId, result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur"
    await markJobFailed(jobId, message)
  }
}
