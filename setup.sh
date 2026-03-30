#!/usr/bin/env bash
# =============================================================================
# Setup — WebAgency · Benjamin Bourger
# Lance ce script une seule fois après un git clone ou git pull majeur.
# Usage : bash setup.sh
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✘${NC}  $1"; exit 1; }
step() { echo -e "\n${BLUE}▶${NC} $1"; }

echo ""
echo "=================================================="
echo "  WebAgency Setup — Benjamin Bourger"
echo "=================================================="

# -----------------------------------------------------------------------------
# 1. Vérification Node.js
# -----------------------------------------------------------------------------
step "Vérification Node.js"

if ! command -v node &> /dev/null; then
  err "Node.js n'est pas installé. Télécharge la v22 LTS sur https://nodejs.org"
fi

NODE_VERSION=$(node -e "process.stdout.write(process.version.slice(1))")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

echo "   Version détectée : v$NODE_VERSION"

# Prisma exige Node 20.19+, 22.12+ ou 24+
VALID=false
if   [ "$NODE_MAJOR" -ge 24 ]; then VALID=true
elif [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -ge 12 ]; then VALID=true
elif [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 19 ]; then VALID=true
fi

if [ "$VALID" = false ]; then
  err "Node.js v$NODE_VERSION n'est pas supporté par Prisma.\n   Requis : 20.19+, 22.12+ ou 24+.\n   Télécharge la dernière v22 LTS sur https://nodejs.org"
fi
ok "Node.js v$NODE_VERSION compatible"

# -----------------------------------------------------------------------------
# 2. Dépendances racine (prospect.js)
# -----------------------------------------------------------------------------
step "Installation des dépendances racine (prospect.js)"
npm install
ok "Dépendances racine installées"

# -----------------------------------------------------------------------------
# 3. Dépendances CRM (Next.js)
# -----------------------------------------------------------------------------
step "Installation des dépendances CRM (Next.js)"
cd crm
npm install
ok "Dépendances CRM installées"

# -----------------------------------------------------------------------------
# 4. Fichiers .env
# -----------------------------------------------------------------------------
step "Vérification des fichiers d'environnement"
cd ..

# Racine : .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  warn ".env créé depuis .env.example — renseigne tes clés API dans .env"
else
  ok ".env déjà présent"
fi

# CRM : .env.local
if [ ! -f "crm/.env.local" ]; then
  cp crm/.env.local.example crm/.env.local
  warn "crm/.env.local créé depuis .env.local.example — renseigne les variables CRM"
else
  ok "crm/.env.local déjà présent"
fi

# -----------------------------------------------------------------------------
# 5. Prisma — génération client + migration
# -----------------------------------------------------------------------------
step "Prisma — génération du client et migration"
cd crm

npx prisma generate
ok "Client Prisma généré"

npx prisma migrate deploy 2>/dev/null || npx prisma db push
ok "Base de données migrée"

cd ..

# -----------------------------------------------------------------------------
# Résumé
# -----------------------------------------------------------------------------
echo ""
echo "=================================================="
echo -e "  ${GREEN}Setup terminé !${NC}"
echo "=================================================="
echo ""
echo "  Prochaines étapes :"
echo ""
echo "  1. Renseigne les clés API dans .env :"
echo "       ANTHROPIC_API_KEY, NETLIFY_TOKEN,"
echo "       GOOGLE_PLACES_KEY, FIRECRAWL_KEY"
echo ""
echo "  2. Renseigne les variables dans crm/.env.local :"
echo "       DATABASE_URL, CRM_SESSION_SECRET, CRM_PASSWORD_HASH"
echo "       → Génère le hash du mot de passe CRM avec :"
echo "         node -e \"const b=require('bcryptjs');b.hash('TON_MDP',10).then(console.log)\""
echo "         (à lancer depuis le dossier crm/ après npm install)"
echo ""
echo "  3. Lance le CRM :"
echo "       cd crm && npm run dev"
echo ""
echo "  4. Lance le pipeline de prospection :"
echo "       node prospect.js \"plombier Steenvoorde\""
echo ""
