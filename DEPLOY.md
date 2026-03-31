# Déploiement — Vercel + Turso

Guide complet pour déployer le CRM sur Vercel avec base de données Turso (SQLite cloud).

---

## Prérequis

- Compte [Vercel](https://vercel.com) (gratuit)
- Compte [Turso](https://turso.tech) (gratuit — 500 DB, 1 GB storage)
- CLI Turso : `npm install -g @tursodatabase/cli`
- Repository GitHub : [BenjaminB-BlueTeam/WebAgency](https://github.com/BenjaminB-BlueTeam/WebAgency)

---

## Étape 1 — Créer la base Turso (5 min)

```bash
# Connexion
turso auth login

# Créer la DB
turso db create webagency-crm --location cdg  # cdg = Paris

# Récupérer l'URL
turso db show webagency-crm --url
# → libsql://webagency-crm-xxx.turso.io

# Créer un token d'accès
turso db tokens create webagency-crm
# → eyJhbGciOiJFZERTQS...
```

Garder ces deux valeurs — elles seront les variables d'environnement.

---

## Étape 2 — Appliquer le schéma Prisma sur Turso

```bash
cd crm

# Créer un .env.local temporaire avec les vars Turso
echo 'DATABASE_URL="libsql://webagency-crm-xxx.turso.io"' >> .env.local
echo 'DATABASE_AUTH_TOKEN="eyJhbGci..."' >> .env.local

# Appliquer les migrations
npx prisma migrate deploy

# (Optionnel) Seeder les données de démo
npx tsx prisma/seed-demo.ts
```

---

## Étape 3 — Déployer sur Vercel (3 min)

### Via GitHub (recommandé)

1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Importer le repo `BenjaminB-BlueTeam/WebAgency`
3. **Root Directory** : `crm`
4. **Framework** : Next.js (auto-détecté)
5. **Environment Variables** — ajouter :
   - `DATABASE_URL` = `libsql://webagency-crm-xxx.turso.io`
   - `DATABASE_AUTH_TOKEN` = `eyJhbGci...`
   - `CRM_SESSION_SECRET` = une chaîne aléatoire 32 chars
   - `CRM_PASSWORD_HASH` = hash bcrypt de votre mot de passe
6. Cliquer **Deploy**

### Générer CRM_PASSWORD_HASH

```bash
node -e "require('bcryptjs').hash('votre-mdp', 12).then(console.log)"
```

---

## Étape 4 — Domaine personnalisé (optionnel)

1. Vercel → Project → Settings → Domains
2. Ajouter `crm.benjaminbourger.fr` (ou autre)
3. Dans OVH DNS : ajouter un CNAME `crm` → `cname.vercel-dns.com`
4. HTTPS automatique en quelques minutes

---

## Développement local

```bash
cd crm

# Copier le template
cp .env.local.example .env.local
# Éditer .env.local avec DATABASE_URL="file:./prisma/dev.db"

# Installer les dépendances
npm install

# Créer/migrer la DB locale
npx prisma migrate deploy

# (Optionnel) Seed les données de démo
npx tsx prisma/seed-demo.ts

# Démarrer
npm run dev  # http://localhost:3000
```

---

## Sync pipeline CLI → Turso

Après avoir lancé `node prospect.js "..."` en local, synchroniser vers Turso :

```bash
# Depuis la racine du projet
# Assurer que .env.local contient les vars Turso (DATABASE_URL + DATABASE_AUTH_TOKEN)
npm run sync-crm
```

Le script `sync-crm.ts` utilise maintenant libsql — il fonctionne avec SQLite local ET Turso.

---

## Architecture

```
Navigateur (desktop / mobile)
        ↓ HTTPS
   Vercel (Edge/Serverless)
        ↓ libsql
   Turso (SQLite cloud, Paris)

Pipeline CLI (local uniquement)
        ↓ npm run sync-crm
   Turso (même DB)
```

**Note** : La page `/prospection` (qui spawn `prospect.js`) reste locale uniquement — Vercel serverless ne supporte pas les subprocesses Node.js longue durée. Sur le déploiement Vercel, cette page affichera un message d'information.

---

## Variables d'environnement — référence complète

| Variable | Local | Production | Description |
|---|---|---|---|
| `DATABASE_URL` | `file:./prisma/dev.db` | `libsql://xxx.turso.io` | URL de la base de données |
| `DATABASE_AUTH_TOKEN` | *(vide)* | `eyJhbGci...` | Token Turso (non requis en local) |
| `CRM_SESSION_SECRET` | `dev-secret-32chars` | chaîne aléatoire 32+ chars | Signe les cookies de session |
| `CRM_PASSWORD_HASH` | *(vide = "admin")* | hash bcrypt | Mot de passe du CRM |
| `NODE_ENV` | `development` | `production` (auto Vercel) | Environnement |
