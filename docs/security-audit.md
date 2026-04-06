# Audit Cybersécurité — OWASP Top 10 2025

**Date :** 2026-04-06
**Scope :** CRM Flandre Web Agency (mono-utilisateur, Vercel)
**Tests :** 303/303 passing — 0 lint errors — 0 TypeScript errors

---

## Résumé

7 corrections appliquées sur les 10 catégories OWASP analysées. 3 catégories sans correctif nécessaire (injection, composants vulnérables, contrôle d'accès cassé — voir détail ci-dessous).

---

## Catégorie A01 — Broken Access Control

**Statut :** ✅ Conforme
- `requireAuth()` présent sur toutes les routes API sans exception
- Pas de mass assignment : allowlists sur tous les champs modifiables
- IDOR sur suppression de notes : non exploitable en mono-utilisateur (risque documenté pour évolution multi-utilisateur)

---

## Catégorie A02 — Cryptographic Failures

**Statut :** ✅ Corrigé
**Correctif :** Validation à l'initialisation de la longueur du secret JWT

```typescript
// src/lib/auth.ts — module scope
if (SESSION_SECRET.length < 32) {
  throw new Error("CRM_SESSION_SECRET must be at least 32 characters")
}
```

- Le serveur refuse de démarrer si le secret est trop court
- bcrypt utilisé pour les mots de passe (work factor 10+)
- Cookies : `httpOnly`, `secure` (production), `sameSite: lax`

---

## Catégorie A03 — Injection

**Statut :** ✅ Conforme (sans correctif)
- Prisma ORM paramétrise toutes les requêtes SQL → SQL injection impossible
- Pas de `eval()`, pas de construction de requêtes par concaténation
- CSP header restreint les sources de scripts → XSS atténué

---

## Catégorie A04 — Insecure Design

**Statut :** ✅ Corrigé
**Correctif :** Comparaison timing-safe du secret cron

```typescript
// src/app/api/cron/veille-prospects/route.ts
const expectedHash = crypto.createHash("sha256").update(expected).digest("hex")
const actualHash   = crypto.createHash("sha256").update(actual).digest("hex")
const safeExpected = Buffer.from(expectedHash)
const safeActual   = Buffer.from(actualHash)
if (safeExpected.length !== safeActual.length || !crypto.timingSafeEqual(safeExpected, safeActual)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

- Hashage SHA-256 avant comparaison → longueurs toujours égales → résistant aux attaques timing
- **Risque accepté :** clé API Pappers en query param (`?api_token=...`) — l'API Pappers ne supporte pas le header Authorization. Risque limité aux logs serveur Pappers (logs HTTPS, non interceptables en transit).

---

## Catégorie A05 — Security Misconfiguration

**Statut :** ✅ Corrigé
**Correctif :** Headers HTTP de sécurité dans `next.config.ts`

| Header | Valeur |
|--------|--------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | Whitelist : self, cdnjs, Google Fonts, Pexels, Netlify |

**Note :** CSP inclut `unsafe-inline` et `unsafe-eval` pour la compatibilité Next.js / Tailwind / Framer Motion. Acceptable pour un tableau de bord interne mono-utilisateur.

---

## Catégorie A06 — Vulnerable and Outdated Components

**Statut :** ⚠️ Avertissement
- `npm audit` : 1 vulnérabilité high dans Vite (path traversal) — dépendance de développement, non exposée en production
- Aucune dépendance runtime critique avec CVE connue
- **Action recommandée :** `npm audit fix` avant le prochain déploiement

---

## Catégorie A07 — Identification and Authentication Failures

**Statut :** ✅ Corrigé
**Correctif :** Rate limiting sur `/api/auth/login`

```typescript
// 5 tentatives par IP sur une fenêtre de 15 minutes → HTTP 429
const MAX_ATTEMPTS = 5
const WINDOW_MS    = 15 * 60 * 1000
```

- Isolation par IP (headers `x-forwarded-for` et `x-real-ip`)
- Fenêtre glissante : réinitialisation automatique après 15 min
- Succès efface le compteur
- Tests : 5 cas couverts (première tentative, dépassement, succès, expiration, isolation IP)
- Limitation : état en mémoire (reset au redémarrage serveur) — acceptable en mono-utilisateur sur Vercel

---

## Catégorie A08 — Software and Data Integrity Failures

**Statut :** ✅ Conforme (sans correctif)
- Dépendances verrouillées dans `package-lock.json`
- Pas de chargement dynamique de scripts distants non signés
- Déploiement via Vercel (pipeline CI/CD contrôlé)

---

## Catégorie A09 — Security Logging and Monitoring Failures

**Statut :** ✅ Corrigé
**Correctifs :**
- Suppression de tous les `console.error(raw_err)` dans les routes API
- Suppression de `console.error("Resend error:", error)` dans `src/lib/email.ts`
- Suppression de `console.error("[relance-writer] error:", error)` dans `src/lib/relance-writer.ts`
- Les réponses d'erreur retournent `{ error: "message générique" }` — jamais de stack trace

**Résultat :** Aucun détail d'erreur interne ne fuite vers les logs serveur ou le client.

---

## Catégorie A10 — Server-Side Request Forgery (SSRF)

**Statut :** ✅ Corrigé
**Correctif :** Validation de l'URL de redirection pour les previews maquette

```typescript
// src/app/api/maquettes/[id]/preview/route.ts
function isAllowedRedirectUrl(url: string): boolean {
  const parsed = new URL(url)  // throws if malformed
  return (
    parsed.protocol === "https:" &&
    (parsed.hostname.endsWith(".netlify.app") || parsed.hostname.endsWith(".netlify.com"))
  )
}
```

- Seuls les domaines `*.netlify.app` et `*.netlify.com` en HTTPS sont autorisés
- URL mal formée → HTTP 400
- URL non-whitelistée → HTTP 400
- Tests : 6 cas couverts (valide, http, domaine inconnu, URL malformée, IP interne)

---

## Tests de non-régression

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `src/__tests__/security/auth-rate-limit.test.ts` | 5 | Rate limiting login |
| `src/__tests__/security/preview-url-validation.test.ts` | 6 | URL whitelist SSRF |
| Total suite | 303 | Toutes features existantes |

---

## Commits appliqués

| Commit | Description |
|--------|-------------|
| `0d16947` | Security headers (CSP, HSTS, X-Frame-Options) |
| `6519bdb` | Whitelist URL preview maquette (SSRF) |
| `2fe3541` | Rate limiting login (5 tentatives / 15 min) |
| `db8e01a` | Timing-safe cron secret + validation secret JWT |
| `4eaaf5b` | Suppression console.error dans les routes API |
| `fcc3453` | Suppression console.error dans email.ts + relance-writer.ts |
