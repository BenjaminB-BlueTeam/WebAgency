-- CreateTable
CREATE TABLE "NouveauProspect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siren" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "activite" TEXT NOT NULL,
    "codeNAF" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "dateCreation" DATETIME NOT NULL,
    "ajouteComme" BOOLEAN NOT NULL DEFAULT false,
    "prospectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "NouveauProspect_siren_key" ON "NouveauProspect"("siren");
