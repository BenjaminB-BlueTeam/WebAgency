// crm/prisma/seed.ts
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "..", ".env.local") });

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const crmPath = path.resolve(__dirname, "../../crm.json");
  if (!fs.existsSync(crmPath)) {
    console.log("No crm.json found at", crmPath, "— skipping seed");
    return;
  }

  const crm = JSON.parse(fs.readFileSync(crmPath, "utf8"));
  console.log(`Seeding ${crm.prospects?.length || 0} prospects...`);

  for (const p of crm.prospects || []) {
    const prospect = await prisma.prospect.upsert({
      where: { nom_ville: { nom: p.nom, ville: p.ville } },
      update: {},
      create: {
        nom: p.nom,
        activite: p.activite || "Non spécifié",
        ville: p.ville,
        telephone: p.telephone || null,
        email: p.email || null,
        siteUrl: p.site_url || null,
        statut: p.statut || "SANS_SITE",
        priorite: p.priorite || "MOYENNE",
        raison: p.raison || null,
        argumentCommercial: p.argument_commercial || null,
        statutPipeline: p.statut_pipeline || "PROSPECT",
        dateAjout: p.date_ajout ? new Date(p.date_ajout) : new Date(),
        dateContact: p.date_contact ? new Date(p.date_contact) : null,
        dateRdv: p.date_rdv ? new Date(p.date_rdv) : null,
        dateDevis: p.date_devis ? new Date(p.date_devis) : null,
        dateSignature: p.date_signature ? new Date(p.date_signature) : null,
        notes: p.notes || null,
        source: "google_places",
      },
    });

    if (p.url_demo) {
      const existingMaquette = await prisma.maquette.findFirst({
        where: { prospectId: prospect.id, demoUrl: p.url_demo },
      });
      if (!existingMaquette) {
        await prisma.maquette.create({
          data: {
            prospectId: prospect.id,
            type: "html",
            demoUrl: p.url_demo,
            propositionUrl: p.url_proposition || null,
            netlifySiteId: p.netlify_demo_site_id || null,
            netlifyPropSiteId: p.netlify_prop_site_id || null,
            statut: "DEPLOYE",
            dateCreation: p.date_ajout ? new Date(p.date_ajout) : new Date(),
          },
        });
      }
    }
  }

  for (const m of crm.mises_a_jour || []) {
    const existingRecherche = await prisma.recherche.findFirst({
      where: { query: m.query, date: m.date ? new Date(m.date) : undefined },
    });
    if (!existingRecherche) {
      await prisma.recherche.create({
        data: {
          query: m.query,
          resultatsCount: m.count,
          prospectsAjoutes: m.added,
          date: m.date ? new Date(m.date) : new Date(),
        },
      });
    }
  }

  const defaults = [
    { cle: "nom", valeur: "Benjamin Bourger" },
    { cle: "adresse", valeur: "Steenvoorde (59114)" },
    { cle: "telephone", valeur: "06.63.78.57.62" },
    { cle: "email", valeur: "benjamin.bourger92@gmail.com" },
    { cle: "siret", valeur: "" },
    { cle: "prix_essentielle", valeur: "299" },
    { cle: "prix_professionnelle", valeur: "499" },
    { cle: "prix_premium", valeur: "799" },
    { cle: "prix_maintenance", valeur: "29" },
    { cle: "tarif_tva", valeur: "0" },
    { cle: "prix_modification", valeur: "30" },
  ];
  for (const d of defaults) {
    await prisma.parametre.upsert({
      where: { cle: d.cle },
      update: {},
      create: d,
    });
  }

  const prospectCount = await prisma.prospect.count();
  const maquetteCount = await prisma.maquette.count();
  const parametreCount = await prisma.parametre.count();
  console.log(
    `Seed complete: ${prospectCount} prospects, ${maquetteCount} maquettes, ${parametreCount} parametres`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
