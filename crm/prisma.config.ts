import path from "path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// .env.local prend la priorité sur .env (Turso en prod, SQLite local en dev)
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") }); // fallback sans override

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
