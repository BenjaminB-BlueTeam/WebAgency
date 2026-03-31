/**
 * sync-crm.ts — Synchronise crm.json (pipeline CLI) → Prisma (CRM web)
 *
 * Usage : npm run sync-crm          (depuis le dossier crm/)
 *         npm run sync-crm          (depuis la racine, via alias)
 *
 * Règles de sync :
 *  - Crée le prospect s'il n'existe pas (clé unique : nom + ville)
 *  - Met à jour les infos techniques si déjà existant
 *  - Ne réinitialise JAMAIS le statutPipeline s'il a progressé au-delà de PROSPECT
 */

import { config } from "dotenv";
import fs from "fs";
import path from "path";

// Charger DATABASE_URL depuis crm/.env.local
config({ path: path.resolve(__dirname, "..", ".env.local") });

const PIPELINE_ORDER = ["PROSPECT", "CONTACTE", "RDV", "DEVIS", "SIGNE", "LIVRE"];

function isPipelineRegression(current: string, next: string): boolean {
  return PIPELINE_ORDER.indexOf(next) < PIPELINE_ORDER.indexOf(current);
}

async function main() {
  const DB_URL = process.env.DATABASE_URL;
  if (!DB_URL) {
    console.error("❌  DATABASE_URL manquant dans crm/.env.local");
    process.exit(1);
  }

  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  const { PrismaClient } = await import("../src/generated/prisma/client");

  const adapter = new PrismaLibSql({
    url: DB_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = new PrismaClient({ adapter });

  // crm.json est à la racine du projet (un niveau au-dessus de crm/)
  const CRM_FILE = path.resolve(__dirname, "..", "..", "crm.json");

  if (!fs.existsSync(CRM_FILE)) {
    console.log("⚠️  crm.json introuvable — rien à synchroniser.");
    console.log(`   Attendu : ${CRM_FILE}`);
    await db.$disconnect();
    return;
  }

  const crm = JSON.parse(fs.readFileSync(CRM_FILE, "utf8")) as {
    prospects: Record<string, unknown>[];
    mises_a_jour?: unknown[];
  };

  const prospects = crm.prospects || [];

  if (!prospects.length) {
    console.log("ℹ️  Aucun prospect dans crm.json.");
    await db.$disconnect();
    return;
  }

  console.log(`\n🔄  Sync crm.json → Prisma`);
  console.log(`    DB      : ${DB_URL}`);
  console.log(`    CRM     : ${CRM_FILE}`);
  console.log(`    Entries : ${prospects.length} prospects\n`);

  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (const p of prospects) {
    const nom = (p.nom as string)?.trim();
    const ville = (p.ville as string)?.trim();

    if (!nom || !ville) {
      console.warn(`   ⚠️  Skipped : entrée sans nom ou ville`);
      skipped++;
      continue;
    }

    const createData = {
      nom,
      activite: (p.activite as string) || "",
      ville,
      telephone: (p.telephone as string) || null,
      email: (p.email as string) || null,
      siteUrl: (p.site_url as string) || null,
      statut: (p.statut as string) || "SANS_SITE",
      priorite: (p.priorite as string) || "MOYENNE",
      raison: (p.raison as string) || null,
      argumentCommercial: (p.argument_commercial as string) || null,
      adresse: (p.adresse as string) || null,
      noteGoogle: p.rating != null ? parseFloat(p.rating as string) : null,
      statutPipeline: (p.statut_pipeline as string) || "PROSPECT",
      dateAjout: p.date_ajout ? new Date(p.date_ajout as string) : new Date(),
      dateContact: p.date_contact ? new Date(p.date_contact as string) : null,
      dateRdv: p.date_rdv ? new Date(p.date_rdv as string) : null,
      dateDevis: p.date_devis ? new Date(p.date_devis as string) : null,
      dateSignature: p.date_signature ? new Date(p.date_signature as string) : null,
      notes: (p.notes as string) || null,
      source: "prospect.js",
    };

    try {
      const existing = await db.prospect.findUnique({
        where: { nom_ville: { nom, ville } },
        select: { id: true, statutPipeline: true },
      });

      if (existing) {
        const pipelineToSet = isPipelineRegression(
          existing.statutPipeline,
          createData.statutPipeline
        )
          ? existing.statutPipeline
          : createData.statutPipeline;

        await db.prospect.update({
          where: { nom_ville: { nom, ville } },
          data: {
            activite: createData.activite,
            telephone: createData.telephone,
            email: createData.email,
            siteUrl: createData.siteUrl,
            statut: createData.statut,
            priorite: createData.priorite,
            raison: createData.raison,
            argumentCommercial: createData.argumentCommercial,
            adresse: createData.adresse,
            noteGoogle: createData.noteGoogle,
            statutPipeline: pipelineToSet,
            source: "prospect.js",
          },
        });
        updated++;
        console.log(`   ✅  MAJ     : ${nom} (${ville})`);
      } else {
        await db.prospect.create({ data: createData });
        created++;
        console.log(`   ➕  Nouveau : ${nom} (${ville})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌  Erreur  : ${nom} (${ville}) — ${msg}`);
      errors++;
    }
  }

  await db.$disconnect();

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅  Sync terminée`);
  console.log(`    Créés    : ${created}`);
  console.log(`    MAJ      : ${updated}`);
  console.log(`    Skippés  : ${skipped}`);
  console.log(`    Erreurs  : ${errors}`);
  console.log(`${"─".repeat(50)}\n`);

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌  Erreur fatale :", err);
  process.exit(1);
});
