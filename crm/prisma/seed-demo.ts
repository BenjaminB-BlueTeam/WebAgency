// prisma/seed-demo.ts — données de démonstration réalistes
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Seeding demo data...");

  // Nettoyer les données existantes
  await prisma.activite.deleteMany();
  await prisma.maquette.deleteMany();
  await prisma.devis.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.prospect.deleteMany();

  // --- PROSPECTS ---
  const boulangerie = await prisma.prospect.create({
    data: {
      nom: "Boulangerie Caron",
      activite: "Boulangerie-pâtisserie",
      ville: "Steenvoorde",
      telephone: "03 28 43 31 61",
      email: "boulangerie.caron@orange.fr",
      siteUrl: "http://boulangerie-caron-steenvoorde.fr",
      statut: "SITE_OBSOLETE",
      priorite: "HAUTE",
      argumentCommercial: "Site non mobile, pas de galerie, horaires absents",
      statutPipeline: "CONTACTE",
      dateAjout: daysAgo(14),
      dateContact: daysAgo(10),
      notes: "Propriétaire réceptif par téléphone, rappeler pour RDV",
    },
  });

  const pharmacie = await prisma.prospect.create({
    data: {
      nom: "Pharmacie des Géants",
      activite: "Pharmacie",
      ville: "Steenvoorde",
      telephone: "03 28 42 50 12",
      statut: "SANS_SITE",
      priorite: "HAUTE",
      argumentCommercial: "Aucune présence web, concurrents Hazebrouck tous en ligne",
      statutPipeline: "RDV",
      dateAjout: daysAgo(12),
      dateContact: daysAgo(9),
      dateRdv: daysAgo(2),
      notes: "RDV fixé, démo à préparer avec maquette pharmacie",
    },
  });

  const soChoux = await prisma.prospect.create({
    data: {
      nom: "So Choux",
      activite: "Traiteur / Restauration",
      ville: "Bailleul",
      telephone: "06 12 34 56 78",
      statut: "SANS_SITE",
      priorite: "HAUTE",
      argumentCommercial: "Très actif sur FB mais pas de site — perd des commandes",
      statutPipeline: "DEVIS",
      dateAjout: daysAgo(20),
      dateContact: daysAgo(15),
      dateRdv: daysAgo(8),
      dateDevis: daysAgo(3),
      notes: "Devis 690€ envoyé, attente validation",
    },
  });

  const qad = await prisma.prospect.create({
    data: {
      nom: "QAD Services",
      activite: "Services aux entreprises",
      ville: "Hazebrouck",
      email: "contact@qad-services.fr",
      statut: "SANS_SITE",
      priorite: "HAUTE",
      argumentCommercial: "Secteur BtoB, site = crédibilité essentielle",
      statutPipeline: "SIGNE",
      dateAjout: daysAgo(30),
      dateContact: daysAgo(25),
      dateRdv: daysAgo(18),
      dateDevis: daysAgo(12),
      dateSignature: daysAgo(5),
      notes: "Acompte 50% reçu, lancement projet",
    },
  });

  const carrosserie = await prisma.prospect.create({
    data: {
      nom: "Carrosserie JLMB",
      activite: "Carrosserie automobile",
      ville: "Steenvoorde",
      telephone: "03 28 42 11 45",
      statut: "SANS_SITE",
      priorite: "MOYENNE",
      argumentCommercial: "Seul carrossier sans site dans le secteur",
      statutPipeline: "CONTACTE",
      dateAjout: daysAgo(9),
      dateContact: daysAgo(9),
      notes: "Premier contact fait, pas de réponse",
    },
  });

  const fleurs = await prisma.prospect.create({
    data: {
      nom: "Aux Fleurs du N°4",
      activite: "Fleuriste",
      ville: "Steenvoorde",
      telephone: "03 28 42 19 73",
      statut: "SANS_SITE",
      priorite: "MOYENNE",
      argumentCommercial: "Mariages/événements — site = vitrine incontournable",
      statutPipeline: "PROSPECT",
      dateAjout: daysAgo(3),
    },
  });

  const boucherie = await prisma.prospect.create({
    data: {
      nom: "Boucherie Terrier et Fils",
      activite: "Boucherie-charcuterie",
      ville: "Bailleul",
      telephone: "03 28 41 88 20",
      statut: "SANS_SITE",
      priorite: "MOYENNE",
      argumentCommercial: "Artisan avec bonne réputation locale mais invisible en ligne",
      statutPipeline: "CONTACTE",
      dateAjout: daysAgo(18),
      dateContact: daysAgo(14),
      notes: "Intéressé mais attend fin de saison",
    },
  });

  const expertPvc = await prisma.prospect.create({
    data: {
      nom: "Expert PVC",
      activite: "Menuiserie / Fenêtres PVC",
      ville: "Bailleul",
      telephone: "06 87 65 43 21",
      statut: "SANS_SITE",
      priorite: "MOYENNE",
      statutPipeline: "LIVRE",
      dateAjout: daysAgo(60),
      dateContact: daysAgo(55),
      dateRdv: daysAgo(50),
      dateDevis: daysAgo(45),
      dateSignature: daysAgo(38),
      dateLivraison: daysAgo(7),
      notes: "Site livré et validé. Client très satisfait.",
    },
  });

  // --- MAQUETTES ---
  await prisma.maquette.create({
    data: {
      prospectId: pharmacie.id,
      type: "html",
      statut: "BROUILLON",
      dateCreation: daysAgo(4),
    },
  });

  const maquetteQad = await prisma.maquette.create({
    data: {
      prospectId: qad.id,
      type: "html",
      demoUrl: "https://qad-services-demo.netlify.app",
      statut: "VALIDE",
      dateCreation: daysAgo(15),
      dateEnvoi: daysAgo(12),
      dateValidation: daysAgo(8),
    },
  });

  await prisma.maquette.create({
    data: {
      prospectId: expertPvc.id,
      type: "html",
      demoUrl: "https://expert-pvc-demo.netlify.app",
      statut: "VALIDE",
      dateCreation: daysAgo(45),
      dateEnvoi: daysAgo(42),
      dateValidation: daysAgo(38),
    },
  });

  // --- DEVIS ---
  const devisSoChoux = await prisma.devis.create({
    data: {
      prospectId: soChoux.id,
      reference: "DEV-2026-001",
      offre: "Offre de base",
      montantHT: 690,
      montantTTC: 690,
      lignes: JSON.stringify([
        { description: "Site vitrine 5 pages", quantite: 1, prixUnitaire: 590, total: 590 },
        { description: "Domaine .fr + hébergement 1 an", quantite: 1, prixUnitaire: 100, total: 100 },
      ]),
      statut: "ENVOYE",
      dateCreation: daysAgo(5),
      dateEnvoi: daysAgo(3),
      dateExpiration: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.devis.create({
    data: {
      prospectId: qad.id,
      reference: "DEV-2026-002",
      offre: "Offre de base + Formulaire devis",
      montantHT: 870,
      montantTTC: 870,
      lignes: JSON.stringify([
        { description: "Site vitrine 5 pages", quantite: 1, prixUnitaire: 590, total: 590 },
        { description: "Formulaire devis interactif", quantite: 1, prixUnitaire: 180, total: 180 },
        { description: "Domaine .fr + hébergement 1 an", quantite: 1, prixUnitaire: 100, total: 100 },
      ]),
      statut: "ACCEPTE",
      dateCreation: daysAgo(12),
      dateEnvoi: daysAgo(10),
      dateAcceptation: daysAgo(5),
    },
  });

  // --- ACTIVITÉS ---
  const activites = [
    { prospectId: expertPvc.id, type: "LIVRAISON", description: "Site Expert PVC livré et validé par le client", date: daysAgo(7) },
    { prospectId: qad.id, type: "SIGNATURE", description: "Contrat signé — QAD Services, acompte 50% reçu", date: daysAgo(5) },
    { prospectId: soChoux.id, type: "DEVIS", description: "Devis DEV-2026-001 envoyé — So Choux, 690€ TTC", date: daysAgo(3) },
    { prospectId: pharmacie.id, type: "RDV", description: "RDV confirmé avec Pharmacie des Géants, démo à préparer", date: daysAgo(2) },
    { prospectId: fleurs.id, type: "CREATION", description: "Nouveau prospect ajouté — Aux Fleurs du N°4, Steenvoorde", date: daysAgo(3) },
    { prospectId: carrosserie.id, type: "CONTACT", description: "Premier contact Carrosserie JLMB — pas de réponse", date: daysAgo(9) },
    { prospectId: boulangerie.id, type: "CONTACT", description: "Appel Boulangerie Caron — propriétaire intéressé, rappel à planifier", date: daysAgo(10) },
    { prospectId: qad.id, type: "MAQUETTE", description: "Maquette QAD Services validée par le client", date: daysAgo(8) },
  ];

  for (const a of activites) {
    await prisma.activite.create({ data: a });
  }

  // --- STATS ---
  const total = await prisma.prospect.count();
  const maquettes = await prisma.maquette.count({ where: { statut: { in: ["ENVOYE", "VALIDE"] } } });
  console.log(`✓ ${total} prospects, ${maquettes} maquettes actives, ${activites.length} activités`);
  console.log("Demo seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
