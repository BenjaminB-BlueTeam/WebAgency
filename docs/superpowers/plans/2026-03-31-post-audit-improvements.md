# Post-Audit Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 10 problèmes identifiés lors de l'audit post-déploiement : sécurité (logout, allowlist), business logic (CA, TVA, mentions légales, parametres), UX (Vercel banner, topbar), et pipeline (opening_hours, cache Places).

**Architecture:** Chaque tâche est indépendante et peut être committée séparément. Pas de migration Prisma requise (TVA = clé Parametre, pas un champ de modèle). Pas de nouveaux packages.

**Tech Stack:** Next.js 16, Prisma 7 + libsql, TypeScript, jose (JWT), Node.js ESModules

---

## Fichiers touchés

| Fichier | Tâches |
|---|---|
| `crm/src/components/layout/sidebar.tsx` | T1 (logout button) |
| `crm/src/app/api/auth/logout/route.ts` | T1 (new file) |
| `crm/src/app/api/parametres/route.ts` | T2 (allowlist fix) |
| `crm/src/app/(dashboard)/parametres/page.tsx` | T2 (TARIF_FIELDS + tva field) |
| `crm/src/app/(dashboard)/page.tsx` | T3 (CA 400→690) |
| `crm/src/components/layout/topbar.tsx` | T3 (/analytics title) |
| `README.md` | T3 (Node version) |
| `crm/src/app/api/devis/route.ts` | T4 (TVA from DB) |
| `crm/src/app/api/factures/route.ts` | T4 (TVA from DB) |
| `crm/src/app/print/devis/[id]/page.tsx` | T4 (conditional TVA display) |
| `crm/src/app/print/factures/[id]/page.tsx` | T4 (conditional TVA display) |
| `crm/src/app/api/devis/[id]/route.ts` | T5 (DELETE 404 check) |
| `crm/src/app/api/factures/[id]/route.ts` | T5 (DELETE 404 check) |
| `crm/src/app/(dashboard)/prospection/page.tsx` | T6 (Vercel banner) |
| `prospect.js` | T7 (opening_hours), T8 (Places cache) |

---

## Task 1 — Logout (sécurité critique)

**Files:**
- Create: `crm/src/app/api/auth/logout/route.ts`
- Modify: `crm/src/components/layout/sidebar.tsx`

### Contexte
Le JWT dure 30 jours et il n'y a aucun bouton de déconnexion. Le cookie s'appelle `session` (voir `crm/src/lib/auth.ts` ligne 39).

- [ ] **Créer la route logout**

Créer `crm/src/app/api/auth/logout/route.ts` :

```ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
```

- [ ] **Ajouter le bouton logout dans la sidebar**

Dans `crm/src/components/layout/sidebar.tsx`, ajouter l'import `LogOut` depuis lucide-react et la fonction `handleLogout`. Le bouton va dans le footer de la sidebar, juste après le bloc profil (Benjamin Bourger).

Ajouter `LogOut` dans l'import lucide-react (ligne 14, après `ChevronsRight`) :

```ts
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Palette,
  Search,
  FileText,
  Receipt,
  TrendingUp,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  X,
} from "lucide-react";
```

Ajouter la fonction `handleLogout` avant le `return` du composant `Sidebar` :

```ts
async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
```

Remplacer le bouton collapse existant (le `<button onClick={toggle} ...>`) par ce bloc qui inclut le bouton logout :

```tsx
<div className="flex items-center gap-1">
  <button
    onClick={handleLogout}
    className="flex size-8 items-center justify-center rounded-lg transition-colors text-white/40 hover:text-red-400 hover:bg-red-400/10"
    aria-label="Se déconnecter"
    title="Se déconnecter"
  >
    <LogOut className="size-4" />
  </button>
  <button
    onClick={toggle}
    className="hidden flex-1 items-center justify-center rounded-lg p-2 transition-colors duration-200 text-white/40 hover:text-white/80 md:flex"
    aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
  >
    {collapsed ? (
      <ChevronsRight className="size-5" />
    ) : (
      <ChevronsLeft className="size-5" />
    )}
  </button>
</div>
```

- [ ] **Vérifier le build**

```bash
cd crm && npm run build 2>&1 | tail -5
```
Attendu : aucune erreur TypeScript.

- [ ] **Commit**

```bash
git add crm/src/app/api/auth/logout/route.ts crm/src/components/layout/sidebar.tsx
git commit -m "feat(auth): add logout route + button in sidebar"
```

---

## Task 2 — Fix allowlist parametres + UI cohérente

**Files:**
- Modify: `crm/src/app/api/parametres/route.ts`
- Modify: `crm/src/app/(dashboard)/parametres/page.tsx`

### Contexte
La page parametres UI tente de sauvegarder `profil_nom`, `tarif_essentielle`, etc., mais AUCUN de ces champs n'est dans l'allowlist. Résultat : tout save échoue avec une erreur 400. De plus, les 4 clés API (`ANTHROPIC_API_KEY`, etc.) sont dans l'allowlist mais ne devraient pas l'être (elles appartiennent à `.env.local`).

Il y a aussi une déconnexion entre les TARIF_FIELDS de la page (ancienne grille 3 niveaux) et la tarification réelle (690€ unique + options).

- [ ] **Corriger l'allowlist dans `crm/src/app/api/parametres/route.ts`**

Remplacer le bloc `ALLOWED_PARAM_KEYS` :

```ts
// A05 — Allowlist: only these keys can be written via the API
const ALLOWED_PARAM_KEYS = new Set([
  // Profil prestataire
  "profil_nom",
  "profil_adresse",
  "profil_telephone",
  "profil_email",
  "profil_siret",
  // Tarification
  "tarif_base",
  "tarif_maintenance",
  "tarif_tva",
  // CRM
  "crm_titre",
  "crm_contact_email",
  "crm_contact_telephone",
]);
```

- [ ] **Mettre à jour la page parametres UI**

Dans `crm/src/app/(dashboard)/parametres/page.tsx`, remplacer le bloc `TARIF_FIELDS` :

```ts
const TARIF_FIELDS: ParamField[] = [
  { cle: "tarif_base", label: "Offre de base", type: "number", suffix: "€" },
  { cle: "tarif_maintenance", label: "Maintenance mensuelle", type: "number", suffix: "€/mois" },
  { cle: "tarif_tva", label: "Taux TVA", type: "number", suffix: "%", placeholder: "0 si franchise de base" },
];
```

- [ ] **Vérifier le build**

```bash
cd crm && npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
git add crm/src/app/api/parametres/route.ts crm/src/app/\(dashboard\)/parametres/page.tsx
git commit -m "fix(parametres): fix broken allowlist, update tarif fields to single-tier pricing"
```

---

## Task 3 — Corrections triviales (CA, topbar, README)

**Files:**
- Modify: `crm/src/app/(dashboard)/page.tsx`
- Modify: `crm/src/components/layout/topbar.tsx`
- Modify: `README.md`

- [ ] **CA potentiel : 400 → 690**

Dans `crm/src/app/(dashboard)/page.tsx`, remplacer les deux occurrences :

```ts
const caPotentiel = hauteCount * 690;
```

Et dans le JSX :
```tsx
subtitle={`${hauteCount} prospects × 690 €`}
```

- [ ] **Ajouter /analytics dans pageTitles**

Dans `crm/src/components/layout/topbar.tsx`, ajouter dans `pageTitles` :

```ts
const pageTitles: Record<string, string> = {
  "/": "Tableau de bord",
  "/prospects": "Prospects",
  "/clients": "Clients",
  "/maquettes": "Maquettes",
  "/prospection": "Prospection",
  "/devis": "Devis",
  "/factures": "Factures",
  "/analytics": "Analytics",
  "/parametres": "Paramètres",
};
```

- [ ] **README — Node version**

Dans `README.md`, remplacer :
```
- **Node.js 18+** (fetch natif requis)
```
Par :
```
- **Node.js 22.12+** (requis par Prisma — voir `package.json` engines)
```

- [ ] **Commit**

```bash
git add crm/src/app/\(dashboard\)/page.tsx crm/src/components/layout/topbar.tsx README.md
git commit -m "fix: CA potentiel 690€, analytics title, README Node version"
```

---

## Task 4 — TVA configurable + mentions légales print

**Files:**
- Modify: `crm/src/app/api/devis/route.ts`
- Modify: `crm/src/app/api/factures/route.ts`
- Modify: `crm/src/app/print/devis/[id]/page.tsx`
- Modify: `crm/src/app/print/factures/[id]/page.tsx`

### Contexte
TVA hardcodée à 20% (`ht * 1.2`). Si Benjamin est auto-entrepreneur en franchise de base de TVA, il ne doit PAS facturer de TVA, et les documents doivent mentionner "TVA non applicable, art. 293 B du CGI".

La clé `tarif_tva` (ajoutée en Task 2) stocke le taux en % sous forme de string (ex: `"0"` ou `"20"`).

- [ ] **Rendre TVA configurable dans `crm/src/app/api/devis/route.ts`**

Remplacer dans la fonction POST :

```ts
// Lire le taux TVA depuis les paramètres (défaut 0 — franchise de base)
const tauxParam = await db.parametre.findUnique({ where: { cle: "tarif_tva" } });
const tauxTva = parseFloat(tauxParam?.valeur ?? "0") / 100;
const ttc = Math.round(ht * (1 + tauxTva) * 100) / 100;
```

Supprimer la ligne `const ttc = Math.round(ht * 1.2 * 100) / 100;`.

- [ ] **Même chose dans `crm/src/app/api/factures/route.ts`**

Même remplacement :

```ts
const tauxParam = await db.parametre.findUnique({ where: { cle: "tarif_tva" } });
const tauxTva = parseFloat(tauxParam?.valeur ?? "0") / 100;
const ttc = Math.round(ht * (1 + tauxTva) * 100) / 100;
```

- [ ] **Mise à jour du print devis — TVA conditionnelle**

Dans `crm/src/app/print/devis/[id]/page.tsx` :

Après la ligne qui calcule `tva` (ligne 52), ajouter :
```ts
const tauxTvaParam = param("tarif_tva", "0");
const tauxTva = parseFloat(tauxTvaParam);
const isFranchiseTva = tauxTva === 0;
```

Dans le JSX, remplacer le bloc TVA :
```tsx
{/* Totaux */}
<div className="totals">
  <div className="total-row ht">
    <span>Montant HT</span>
    <span>{fmt(devis.montantHT)} €</span>
  </div>
  {isFranchiseTva ? (
    <div className="total-row">
      <span style={{ fontStyle: "italic", color: "#888" }}>
        TVA non applicable — art. 293 B du CGI
      </span>
      <span>—</span>
    </div>
  ) : (
    <div className="total-row">
      <span>TVA ({tauxTva} %)</span>
      <span>{fmt(tva)} €</span>
    </div>
  )}
  <div className="total-row ttc">
    <span>Total {isFranchiseTva ? "HT" : "TTC"}</span>
    <span>{fmt(devis.montantTTC)} €</span>
  </div>
</div>
```

- [ ] **Même mise à jour dans le print factures**

Même logique dans `crm/src/app/print/factures/[id]/page.tsx`. Chercher le bloc `totals` et appliquer le même pattern conditionnel.

- [ ] **Vérifier le build**

```bash
cd crm && npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
git add crm/src/app/api/devis/route.ts crm/src/app/api/factures/route.ts crm/src/app/print/devis/[id]/page.tsx crm/src/app/print/factures/[id]/page.tsx
git commit -m "feat(tva): configurable TVA rate, conditional mention art.293B on print pages"
```

---

## Task 5 — DELETE 404 propre (devis + factures)

**Files:**
- Modify: `crm/src/app/api/devis/[id]/route.ts`
- Modify: `crm/src/app/api/factures/[id]/route.ts`

### Contexte
Les handlers DELETE ne vérifient pas l'existence avant suppression. Prisma lève `P2025` si l'ID n'existe pas, non catchée → 500.

- [ ] **Ajouter gestion d'erreur DELETE dans devis/[id]/route.ts**

Lire le fichier d'abord pour trouver le handler DELETE, puis wrapper avec try/catch :

```ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    await db.devis.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Devis non trouvé" }, { status: 404 });
  }
}
```

- [ ] **Même chose dans factures/[id]/route.ts**

```ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    await db.facture.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });
  }
}
```

- [ ] **Commit**

```bash
git add crm/src/app/api/devis/[id]/route.ts crm/src/app/api/factures/[id]/route.ts
git commit -m "fix(api): return 404 on DELETE non-existent devis/factures"
```

---

## Task 6 — Banner Vercel sur /prospection

**Files:**
- Modify: `crm/src/app/(dashboard)/prospection/page.tsx`

### Contexte
La page `/prospection` spawne `prospect.js` via child_process. Sur Vercel, les serverless functions n'autorisent pas les subprocesses longs → la prospection échoue silencieusement en production.

- [ ] **Ajouter un composant banner en haut de la page**

Dans `crm/src/app/(dashboard)/prospection/page.tsx`, ajouter après les imports :

```ts
const IS_VERCEL = process.env.NEXT_PUBLIC_VERCEL === "1";
```

Dans le JSX, ajouter en premier enfant du return :

```tsx
{IS_VERCEL && (
  <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
    <strong>Mode production Vercel :</strong> la prospection automatique n&apos;est pas disponible en ligne.
    Lancez <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-xs">node prospect.js &quot;votre recherche&quot;</code> en local, puis synchronisez avec <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-xs">npm run sync-crm</code>.
  </div>
)}
```

Dans `crm/.env.local` (et `.env.local.example`), ajouter :
```
# Mettre à "1" en production Vercel pour afficher le banner prospection
NEXT_PUBLIC_VERCEL=
```

Dans Vercel Dashboard → Settings → Environment Variables, ajouter `NEXT_PUBLIC_VERCEL=1` pour les envs Production et Preview.

- [ ] **Commit**

```bash
git add crm/src/app/\(dashboard\)/prospection/page.tsx crm/.env.local.example
git commit -m "feat(prospection): add Vercel environment banner for local-only pipeline"
```

---

## Task 7 — Opening hours dans le pipeline

**Files:**
- Modify: `prospect.js`

### Contexte
`placesDetails()` (ligne 271) demande déjà `opening_hours` à l'API mais ne l'utilise jamais. Les maquettes utilisent des horaires fictifs. On veut injecter les vrais horaires dans `crm.json` et dans `getUserPrompt()`.

L'API Places retourne `opening_hours.weekday_text` : tableau de 7 strings FR comme `["Lundi: 8:00 – 18:00", "Mardi: 8:00 – 18:00", ...]`.

- [ ] **Extraire opening_hours dans rechercherProspects**

Trouver où les résultats Places Details sont mappés vers les objets prospect (après le `placesDetails()` call). Ajouter l'extraction :

```js
const horaires = details.opening_hours?.weekday_text || [];
```

Puis ajouter `horaires` dans l'objet prospect construit (là où sont `telephone`, `website`, etc.) :

```js
horaires: horaires, // string[] | []
```

- [ ] **Ajouter horaires dans crm.json**

Dans la fonction qui écrit dans `crm.json`, ajouter le champ `horaires` dans l'objet prospect sérialisé.

- [ ] **Injecter les horaires dans getUserPrompt()**

Dans `getUserPrompt()` (ligne ~655), ajouter le paramètre et son injection. Modifier la signature :

```js
function getUserPrompt(prospect, d, gfUrl, analyse, concurrents) {
```

Dans le template, dans la section CONTACT (avant `Commence par <!DOCTYPE html>`), ajouter :

```js
const horairesSection = prospect.horaires?.length
  ? `\nHORAIRES RÉELS (à utiliser dans la section Contact) :\n${prospect.horaires.join("\n")}`
  : "";
```

Et insérer `${horairesSection}` avant `\nCommence par <!DOCTYPE html>.` dans le return.

- [ ] **Commit**

```bash
git add prospect.js
git commit -m "feat(pipeline): inject real opening_hours from Places API into maquettes"
```

---

## Task 8 — Cache Places API (24h TTL)

**Files:**
- Modify: `prospect.js`

### Contexte
Chaque run `node prospect.js "..."` re-requête Places API même si la même recherche a été faite il y a 5 minutes. Un cache fichier simple évite de consommer du quota inutilement.

Le cache sera stocké dans `cache/places/` à la racine du projet. Un fichier par query (nom = hash MD5 de la query). TTL : 24h.

- [ ] **Ajouter les helpers cache en haut de prospect.js**

Après les imports existants, ajouter :

```js
import { createHash } from "crypto";
import { mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";

const CACHE_DIR = new URL("./cache/places/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

try { mkdirSync(CACHE_DIR, { recursive: true }); } catch { /* exists */ }

async function getCachedPlaces(query) {
  const key = createHash("md5").update(query).digest("hex");
  const file = `${CACHE_DIR}/${key}.json`;
  try {
    const raw = await readFile(file, "utf8");
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL_MS) {
      console.log(`   💾  Cache Places utilisé pour "${query}"`);
      return data;
    }
  } catch { /* cache miss */ }
  return null;
}

async function setCachedPlaces(query, data) {
  const key = createHash("md5").update(query).digest("hex");
  const file = `${CACHE_DIR}/${key}.json`;
  await writeFile(file, JSON.stringify({ ts: Date.now(), data }), "utf8");
}
```

- [ ] **Utiliser le cache dans placesTextSearch()**

Dans `placesTextSearch()`, encadrer la logique existante :

```js
async function placesTextSearch(query) {
  // Cache check
  const cached = await getCachedPlaces(query);
  if (cached) return cached;

  // ... logique existante ...

  // Cache save (avant le return)
  await setCachedPlaces(query, filtered);
  return filtered;
}
```

- [ ] **Ajouter cache/ au .gitignore**

Dans `.gitignore` à la racine, ajouter :
```
cache/
```

- [ ] **Commit**

```bash
git add prospect.js .gitignore
git commit -m "feat(pipeline): add 24h file cache for Places API queries"
```

---

## Vérification finale

- [ ] **Build CRM propre**

```bash
cd crm && npm run build 2>&1 | grep -E "error|Error|✓"
```
Attendu : `✓ Compiled successfully` ou équivalent, aucune erreur.

- [ ] **Vérifier prix**

```bash
grep -n "400\|1\.2\|20 %" crm/src/app/\(dashboard\)/page.tsx crm/src/app/api/devis/route.ts
```
Attendu : aucun résultat avec ces valeurs obsolètes.

- [ ] **Vérifier allowlist**

```bash
grep -n "ANTHROPIC_API_KEY\|NETLIFY_TOKEN" crm/src/app/api/parametres/route.ts
```
Attendu : aucun résultat.

- [ ] **Vérifier logout route**

```bash
ls crm/src/app/api/auth/logout/route.ts
```
Attendu : fichier présent.

- [ ] **Commit final si tout propre**

```bash
git push origin main
```
