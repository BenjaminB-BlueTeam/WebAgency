-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Maquette" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'html',
    "htmlPath" TEXT,
    "html" TEXT,
    "demoUrl" TEXT,
    "propositionUrl" TEXT,
    "netlifySiteId" TEXT,
    "netlifyPropSiteId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnvoi" DATETIME,
    "dateValidation" DATETIME,
    "retourClient" TEXT,
    "githubUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "promptUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Maquette_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Maquette" ("createdAt", "dateCreation", "dateEnvoi", "dateValidation", "demoUrl", "html", "htmlPath", "id", "netlifyPropSiteId", "netlifySiteId", "propositionUrl", "prospectId", "retourClient", "statut", "type", "updatedAt") SELECT "createdAt", "dateCreation", "dateEnvoi", "dateValidation", "demoUrl", "html", "htmlPath", "id", "netlifyPropSiteId", "netlifySiteId", "propositionUrl", "prospectId", "retourClient", "statut", "type", "updatedAt" FROM "Maquette";
DROP TABLE "Maquette";
ALTER TABLE "new_Maquette" RENAME TO "Maquette";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
