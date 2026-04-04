-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "activite" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteUrl" TEXT,
    "placeId" TEXT,
    "noteGoogle" REAL,
    "nbAvisGoogle" INTEGER,
    "scorePresenceWeb" INTEGER,
    "scoreSEO" INTEGER,
    "scoreDesign" INTEGER,
    "scoreFinancier" INTEGER,
    "scorePotentiel" INTEGER,
    "scoreGlobal" INTEGER,
    "statutPipeline" TEXT NOT NULL DEFAULT 'A_DEMARCHER',
    "dateContact" DATETIME,
    "dateRdv" DATETIME,
    "dateMaquetteEnvoi" DATETIME,
    "dateSignature" DATETIME,
    "raisonPerte" TEXT,
    "derniereRelance" DATETIME,
    "prochaineRelance" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Analyse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "concurrents" TEXT NOT NULL,
    "recommandations" TEXT NOT NULL,
    "promptUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analyse_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Maquette" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "demoUrl" TEXT,
    "netlifySiteId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "promptUsed" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Maquette_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateEnvoi" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Email_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Note_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activite_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recherche" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "ville" TEXT,
    "resultatsCount" INTEGER NOT NULL,
    "prospectsAjoutes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "plausibleSiteId" TEXT,
    "dateLivraison" DATETIME NOT NULL,
    "offreType" TEXT NOT NULL,
    "maintenanceActive" BOOLEAN NOT NULL DEFAULT true,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rapport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "mois" TEXT NOT NULL,
    "visiteurs" INTEGER NOT NULL,
    "pagesVues" INTEGER NOT NULL,
    "topPages" TEXT NOT NULL,
    "topSources" TEXT NOT NULL,
    "tendance" REAL,
    "resumeIA" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "dateEnvoi" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rapport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_placeId_key" ON "Prospect"("placeId");

-- CreateIndex
CREATE INDEX "Prospect_statutPipeline_idx" ON "Prospect"("statutPipeline");

-- CreateIndex
CREATE INDEX "Prospect_scoreGlobal_idx" ON "Prospect"("scoreGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_nom_ville_key" ON "Prospect"("nom", "ville");

-- CreateIndex
CREATE UNIQUE INDEX "Parametre_cle_key" ON "Parametre"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "Client_prospectId_key" ON "Client"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "Rapport_clientId_mois_key" ON "Rapport"("clientId", "mois");
