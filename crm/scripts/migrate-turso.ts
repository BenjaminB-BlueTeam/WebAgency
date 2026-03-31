/**
 * migrate-turso.ts — Applique les migrations Prisma sur Turso (libsql)
 *
 * Usage : npx tsx scripts/migrate-turso.ts
 *
 * Prisma's migration engine ne supporte pas libsql://, ce script le remplace.
 * Il lit les fichiers prisma/migrations/*.sql et les applique via @libsql/client.
 * Compatible avec la table _prisma_migrations (même format que prisma migrate deploy).
 */

import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "..", ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !url.startsWith("libsql://")) {
    console.error("❌  DATABASE_URL doit être une URL libsql:// (Turso)");
    console.error("    Valeur actuelle :", url ?? "(vide)");
    process.exit(1);
  }

  console.log(`\n🔄  Migration Turso`);
  console.log(`    DB : ${url}\n`);

  const client = createClient({ url, authToken });

  // Créer la table de suivi si elle n'existe pas (compatible Prisma)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  TEXT    NOT NULL PRIMARY KEY,
      "checksum"            TEXT    NOT NULL,
      "finished_at"         DATETIME,
      "migration_name"      TEXT    NOT NULL,
      "logs"                TEXT,
      "rolled_back_at"      DATETIME,
      "started_at"          DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  const migrationsDir = path.resolve(__dirname, "..", "prisma", "migrations");
  const folders = fs
    .readdirSync(migrationsDir)
    .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .sort();

  let applied = 0;
  let skipped = 0;

  for (const folder of folders) {
    const sqlFile = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    // Vérifier si déjà appliquée
    const existing = await client.execute({
      sql: "SELECT id FROM _prisma_migrations WHERE migration_name = ?",
      args: [folder],
    });

    if (existing.rows.length > 0) {
      console.log(`   ⏭   Skip (déjà appliquée) : ${folder}`);
      skipped++;
      continue;
    }

    const sql = fs.readFileSync(sqlFile, "utf8");

    // Découper en statements individuels (ignorer les lignes de commentaires)
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.replace(/--[^\n]*/g, "").trim())
      .filter((s) => s.length > 0)
      .map((s) => ({ sql: s.endsWith(";") ? s : s + ";" }));

    try {
      if (statements.length > 0) {
        await client.batch(statements, "write");
      }

      // Enregistrer comme appliquée
      await client.execute({
        sql: `INSERT INTO _prisma_migrations
              (id, checksum, migration_name, applied_steps_count, finished_at)
              VALUES (?, ?, ?, 1, datetime('now'))`,
        args: [randomUUID(), "turso-manual", folder],
      });

      console.log(`   ✅  Appliquée : ${folder}`);
      applied++;
    } catch (err) {
      console.error(`   ❌  Erreur sur : ${folder}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅  Migrations terminées`);
  console.log(`    Appliquées : ${applied}`);
  console.log(`    Skippées   : ${skipped}`);
  console.log(`${"─".repeat(50)}\n`);

  client.close();
}

main().catch((err) => {
  console.error("❌  Erreur fatale :", err);
  process.exit(1);
});
