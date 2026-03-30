-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "activite" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "siteUrl" TEXT,
    "statut" TEXT NOT NULL,
    "priorite" TEXT NOT NULL,
    "raison" TEXT,
    "argumentCommercial" TEXT,
    "statutPipeline" TEXT NOT NULL DEFAULT 'PROSPECT',
    "dateAjout" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateContact" DATETIME,
    "dateRdv" DATETIME,
    "dateDevis" DATETIME,
    "dateSignature" DATETIME,
    "dateLivraison" DATETIME,
    "notes" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Maquette" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'html',
    "htmlPath" TEXT,
    "demoUrl" TEXT,
    "propositionUrl" TEXT,
    "netlifySiteId" TEXT,
    "netlifyPropSiteId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnvoi" DATETIME,
    "dateValidation" DATETIME,
    "retourClient" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Maquette_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "offre" TEXT NOT NULL,
    "montantHT" REAL NOT NULL,
    "montantTTC" REAL NOT NULL,
    "lignes" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnvoi" DATETIME,
    "dateAcceptation" DATETIME,
    "dateExpiration" DATETIME,
    "validiteJours" INTEGER NOT NULL DEFAULT 30,
    "pdfPath" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Devis_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "devisId" TEXT,
    "reference" TEXT NOT NULL,
    "montantHT" REAL NOT NULL,
    "montantTTC" REAL NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" DATETIME,
    "dateAcompte" DATETIME,
    "datePaiement" DATETIME,
    "montantAcompte" REAL,
    "pdfPath" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Facture_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activite_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recherche" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "resultatsCount" INTEGER NOT NULL,
    "prospectsAjoutes" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rapport" TEXT
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_nom_ville_key" ON "Prospect"("nom", "ville");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_reference_key" ON "Devis"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_devisId_key" ON "Facture"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_reference_key" ON "Facture"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Parametre_cle_key" ON "Parametre"("cle");
