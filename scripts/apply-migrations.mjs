// Run: node scripts/apply-migrations.mjs
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url || !authToken) {
  console.error("DATABASE_URL and DATABASE_AUTH_TOKEN must be set")
  process.exit(1)
}

const client = createClient({ url, authToken })

const migrations = [
  "prisma/migrations/20260404085542_init/migration.sql",
  "prisma/migrations/20260405134428_add_analyse_unique_prospectid/migration.sql",
]

for (const path of migrations) {
  console.log(`Applying ${path}...`)
  const sql = readFileSync(path, "utf8")
  // Split on semicolons, filter empty statements
  const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0)
  for (const stmt of statements) {
    await client.execute(stmt)
  }
  console.log(`  ✓ Done`)
}

console.log("All migrations applied.")
