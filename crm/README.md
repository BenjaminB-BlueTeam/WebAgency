# CRM — Flandre Web

CRM interne pour la gestion commerciale de l'agence web.

## Setup

```bash
cp .env.local.example .env.local
# Éditer .env.local avec tes variables (voir le fichier pour les instructions)
npm install
npx prisma migrate deploy
npm run dev
```

## Stack

- Next.js 16 + React 19
- Prisma 7 + libsql (SQLite local / Turso prod)
- shadcn/ui + Tailwind 4
- Auth JWT (jose + bcryptjs)

## Déploiement

Voir `DEPLOY.md` à la racine du projet pour le guide Vercel + Turso.
