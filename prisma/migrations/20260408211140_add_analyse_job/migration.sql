-- CreateTable
CREATE TABLE "AnalyseJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "etapes" TEXT NOT NULL DEFAULT '[]',
    "resultat" TEXT,
    "erreur" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalyseJob_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyseJob_prospectId_idx" ON "AnalyseJob"("prospectId");
