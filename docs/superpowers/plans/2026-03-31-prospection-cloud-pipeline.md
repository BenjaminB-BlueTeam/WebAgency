# Prospection Cloud Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `spawn(prospect.js)` approach with independent API routes (Google Places + Claude) so the prospection pipeline works fully from the deployed Vercel CRM.

**Architecture:** Three new endpoints handle search (SSE stream), maquette generation (Claude HTML + Netlify REST API deploy), and email generation (Claude). The old job-based SSE system is removed. The prospection page becomes search-first: find prospects → select → add to CRM → generate maquette + email on demand from the prospect detail page.

**Tech Stack:** Next.js 16 App Router, `@anthropic-ai/sdk`, `jszip`, Netlify Sites REST API, Google Places Text Search + Details API, Prisma/libsql, Tailwind CSS, Sonner toasts

---

## File Structure

**Create:**
- `crm/src/lib/places.ts` — Google Places API helpers (text search + details)
- `crm/src/lib/design-direction.ts` — `getDesignDirection()` ported from prospect.js
- `crm/src/lib/prompts/maquette.ts` — `getSystemPrompt()` + `getUserPrompt()` for Claude HTML generation
- `crm/src/lib/prompts/email.ts` — `getEmailPrompt()` for Claude email generation
- `crm/src/lib/netlify-deploy.ts` — `deployToNetlify()` using jszip + Netlify REST API
- `crm/src/app/api/prospection/search/route.ts` — SSE search endpoint (replaces start + stream)
- `crm/src/app/api/maquettes/generate/route.ts` — POST: Claude HTML generation + Netlify deploy
- `crm/src/app/api/prospects/[id]/email/route.ts` — POST: Claude email generation
- `crm/src/components/prospection/search-result-card.tsx` — Card for pre-save search results

**Modify:**
- `crm/package.json` — add `@anthropic-ai/sdk`, `jszip`
- `crm/prisma/schema.prisma` — add `html String?` to Maquette model
- `crm/src/app/api/prospects/route.ts` — add `adresse`, `noteGoogle` to POST handler
- `crm/src/app/(dashboard)/prospection/page.tsx` — complete redesign (SSE consumer for search)
- `crm/src/components/prospection/prospection-search-panel.tsx` — remove mode selector
- `crm/src/components/prospection/prospection-results-panel.tsx` — redesign for search results + Add button
- `crm/src/app/(dashboard)/prospects/[id]/page.tsx` — add MaquetteSection + EmailSection client components

**Delete:**
- `crm/src/app/api/prospection/start/route.ts`
- `crm/src/app/api/prospection/[jobId]/stream/route.ts`
- `crm/src/lib/prospection-jobs.ts`
- `crm/src/components/prospection/prospection-progress.tsx`
- `crm/src/components/prospection/prospect-result-card.tsx`

---

## Task 1: Dependencies + Prisma migration

**Files:**
- Modify: `crm/package.json`
- Modify: `crm/prisma/schema.prisma`
- Modify: `crm/src/app/api/prospects/route.ts`

- [ ] **Step 1: Install new dependencies**

```bash
cd crm && npm install @anthropic-ai/sdk jszip
```

Expected: both packages appear in `node_modules/`, `package.json` updated.

- [ ] **Step 2: Add `html` field to Maquette in schema.prisma**

In `crm/prisma/schema.prisma`, in the `Maquette` model, add after `htmlPath`:

```prisma
  html              String?
```

Full updated Maquette model:
```prisma
model Maquette {
  id                String   @id @default(cuid())
  prospectId        String
  prospect          Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  type              String   @default("html")
  htmlPath          String?
  html              String?
  demoUrl           String?
  propositionUrl    String?
  netlifySiteId     String?
  netlifyPropSiteId String?
  statut            String   @default("BROUILLON")
  dateCreation      DateTime @default(now())
  dateEnvoi         DateTime?
  dateValidation    DateTime?
  retourClient      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

- [ ] **Step 3: Generate Prisma client + create migration**

```bash
cd crm && npx prisma migrate dev --name add-maquette-html
```

Expected output: `✔ Generated Prisma client` and a new migration file in `prisma/migrations/`.

- [ ] **Step 4: Add `adresse` and `noteGoogle` to POST /api/prospects**

In `crm/src/app/api/prospects/route.ts`, update the POST handler destructuring and `db.prospect.create` data:

```typescript
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();

  const {
    nom,
    activite,
    ville,
    telephone,
    email,
    siteUrl,
    statut = "SANS_SITE",
    priorite = "MOYENNE",
    raison,
    argumentCommercial,
    source = "MANUEL",
    adresse,
    noteGoogle,
  } = body;

  if (!nom || !activite || !ville) {
    return NextResponse.json(
      { error: "nom, activite et ville sont requis" },
      { status: 400 }
    );
  }

  if (siteUrl && !/^https?:\/\//.test(String(siteUrl))) {
    return NextResponse.json({ error: "siteUrl invalide" }, { status: 400 });
  }

  const prospect = await db.prospect.create({
    data: {
      nom,
      activite,
      ville,
      telephone,
      email,
      siteUrl,
      statut,
      priorite,
      raison,
      argumentCommercial,
      source,
      adresse: adresse ? String(adresse).slice(0, 300) : null,
      noteGoogle: noteGoogle != null ? parseFloat(noteGoogle) || null : null,
    },
  });

  await db.activite.create({
    data: {
      prospectId: prospect.id,
      type: "NOTE",
      description: `Prospect ajouté (${source})`,
    },
  });

  return NextResponse.json(prospect, { status: 201 });
}
```

- [ ] **Step 5: Verify build passes**

```bash
cd crm && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with 0 errors.

- [ ] **Step 6: Commit**

```bash
cd crm && git add package.json package-lock.json prisma/schema.prisma prisma/migrations/ src/app/api/prospects/route.ts
git commit -m "feat(pipeline): add @anthropic-ai/sdk, jszip, Maquette.html field, adresse/noteGoogle to prospects POST"
```

---

## Task 2: Google Places utilities

**Files:**
- Create: `crm/src/lib/places.ts`

- [ ] **Step 1: Create `crm/src/lib/places.ts`**

```typescript
// crm/src/lib/places.ts

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  types: string[];
}

export interface PlaceDetails {
  name: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  opening_hours?: {
    weekday_text: string[];
  };
}

const PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

export async function placesTextSearch(query: string): Promise<GooglePlace[]> {
  if (!PLACES_KEY) throw new Error("GOOGLE_PLACES_KEY manquant");

  // Enrich single-word queries
  const words = query.trim().split(/\s+/);
  const effectiveQuery = words.length === 1 ? `commerces ${query}` : query;

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(effectiveQuery)}&language=fr&region=fr&key=${PLACES_KEY}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  const data = await res.json() as { status: string; results?: GooglePlace[] };

  if (data.status === "ZERO_RESULTS") return [];
  if (data.status !== "OK") {
    console.error(`[places] Text search error: ${data.status}`);
    return [];
  }

  const NON_GEO = new Set(["locality", "political", "administrative_area_level_1", "administrative_area_level_2", "country"]);
  return (data.results ?? []).filter(r => !r.types?.every(t => NON_GEO.has(t)));
}

export async function placesDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!PLACES_KEY) return null;

  const fields = "name,formatted_phone_number,website,opening_hours,rating";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=fr&key=${PLACES_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json() as { status: string; result?: PlaceDetails };
    if (data.status !== "OK") return null;
    return data.result ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd crm && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `places.ts`.

- [ ] **Step 3: Commit**

```bash
cd crm && git add src/lib/places.ts && git commit -m "feat(pipeline): add places.ts — Google Places Text Search + Details"
```

---

## Task 3: Design direction utility

**Files:**
- Create: `crm/src/lib/design-direction.ts`

- [ ] **Step 1: Create `crm/src/lib/design-direction.ts`**

```typescript
// crm/src/lib/design-direction.ts

export interface DesignDirection {
  palette: { primary: string; accent: string; bg: string; surface: string; text: string };
  style: string;
  fontDisplay: string;
  fontBody: string;
  fonts: { display: string; body: string };
  heroTag: string;
  ambiance: string;
  stats: Array<{ val: string; unit: string; label: string }>;
  services: string[];
  heroTitle: (nom: string, ville: string) => string;
  heroSub: string;
}

export function getDesignDirection(activite: string): DesignDirection {
  const a = activite.toLowerCase();

  if (a.match(/plombier|chauffage|sanitaire|chauffagiste/)) return {
    palette: { primary: "#1a3a5c", accent: "#e8a020", bg: "#f4f7fa", surface: "#e8eef5", text: "#0d1f33" },
    style: "industriel-premium", fontDisplay: "Barlow Condensed", fontBody: "Barlow",
    fonts: { display: "Barlow+Condensed:wght@600;700;800", body: "Barlow:wght@400;500;600" },
    heroTag: "Urgence 24h/24 · Devis gratuit · Garantie décennale",
    ambiance: "Marine profond + accents cuivrés. Texture métallique en hero. Chiffres d'impact très visibles. Typo condensée imposante.",
    stats: [{ val: "15", unit: "ans", label: "d'expérience" }, { val: "500+", unit: "", label: "chantiers" }, { val: "24h", unit: "/24", label: "disponible" }, { val: "4.9", unit: "/5", label: "satisfaction" }],
    services: ["Dépannage urgence", "Installation sanitaire", "Rénovation salle de bain", "Chauffage & chaudière", "Détection de fuite", "Entretien annuel"],
    heroTitle: (nom, ville) => `Votre plombier de confiance à ${ville}`,
    heroSub: "Intervention rapide · Devis gratuit · Garantie décennale",
  };

  if (a.match(/électricien|electricien|électricité/)) return {
    palette: { primary: "#0a0f1e", accent: "#f5c518", bg: "#ffffff", surface: "#f0f4f8", text: "#0a0f1e" },
    style: "tech-bold", fontDisplay: "Rajdhani", fontBody: "Nunito Sans",
    fonts: { display: "Rajdhani:wght@600;700", body: "Nunito+Sans:wght@400;600" },
    heroTag: "Certifié RGE · Domotique · Rénovation électrique",
    ambiance: "Noir absolu + jaune électrique. Grille technique en fond. Badges certifications. Animations rapides.",
    stats: [{ val: "RGE", unit: "", label: "Certifié" }, { val: "10+", unit: "ans", label: "d'expérience" }, { val: "300+", unit: "", label: "clients" }, { val: "48h", unit: "", label: "délai devis" }],
    services: ["Tableau électrique", "Domotique & connecté", "Installation neuve", "Rénovation complète", "Dépannage urgent", "Bornes IRVE"],
    heroTitle: (nom, ville) => `Électricien expert à ${ville}`,
    heroSub: "Installation · Rénovation · Domotique · Certifié RGE",
  };

  if (a.match(/coiffeur|coiffure|barbier|salon/)) return {
    palette: { primary: "#1e1209", accent: "#bf8c5a", bg: "#fdf8f3", surface: "#f5ede3", text: "#1e1209" },
    style: "luxe-editorial", fontDisplay: "Playfair Display", fontBody: "Lato",
    fonts: { display: "Playfair+Display:wght@400;700;900", body: "Lato:wght@300;400;700" },
    heroTag: "Élégance · Savoir-faire · Passion capillaire",
    ambiance: "Chocolat chaud et crème. Typo serif élancée. Photos plein cadre. Réservation très visible.",
    stats: [{ val: "8", unit: "ans", label: "d'expertise" }, { val: "2000+", unit: "", label: "clients" }, { val: "4.9", unit: "/5", label: "avis Google" }, { val: "100%", unit: "", label: "produits pro" }],
    services: ["Coupe femme & homme", "Coloration & balayage", "Soins capillaires", "Coiffure mariage", "Brushing & mise en plis", "Barbe & rasage"],
    heroTitle: (nom, ville) => `${nom} — Votre salon à ${ville}`,
    heroSub: "Coupe · Couleur · Soin · Prise de rendez-vous en ligne",
  };

  if (a.match(/restaurant|brasserie|friterie|estaminet|traiteur|pizz/)) return {
    palette: { primary: "#1a0e05", accent: "#c94f1a", bg: "#fefcf7", surface: "#f5ede0", text: "#1a0e05" },
    style: "chaleureux-gourmet", fontDisplay: "Cormorant Garamond", fontBody: "Source Sans 3",
    fonts: { display: "Cormorant+Garamond:wght@400;600;700", body: "Source+Sans+3:wght@400;600" },
    heroTag: "Cuisine maison · Produits locaux · Saveurs du Nord",
    ambiance: "Terre cuite et ivoire chaud. Grande photo ambiance avec overlay. Menu en évidence. Horaires très visibles.",
    stats: [{ val: "12", unit: "ans", label: "d'ouverture" }, { val: "50+", unit: "", label: "couverts" }, { val: "100%", unit: "", label: "fait maison" }, { val: "4.8", unit: "/5", label: "TripAdvisor" }],
    services: ["Cuisine traditionnelle", "Spécialités flamandes", "Pizzas maison", "Plats à emporter", "Groupes & réceptions", "Menu du jour"],
    heroTitle: (nom, ville) => `${nom} — Saveurs du Nord à ${ville}`,
    heroSub: "Cuisine traditionnelle · Sur place & à emporter · Groupes bienvenus",
  };

  if (a.match(/boulangerie|pâtisserie|patisserie|boulanger/)) return {
    palette: { primary: "#2e1c0e", accent: "#d4a843", bg: "#fdf9ef", surface: "#f5ead0", text: "#2e1c0e" },
    style: "artisanal-chaleureux", fontDisplay: "Abril Fatface", fontBody: "Merriweather Sans",
    fonts: { display: "Abril+Fatface", body: "Merriweather+Sans:wght@400;700" },
    heroTag: "Fait maison chaque matin · Au levain · Sans conservateur",
    ambiance: "Blé doré et chocolat. Textures grain subtil. Typo ronde et chaleureuse. Horaires très visibles.",
    stats: [{ val: "20", unit: "ans", label: "de passion" }, { val: "30+", unit: "", label: "références pain" }, { val: "7j", unit: "/7", label: "ouvert" }, { val: "100%", unit: "", label: "artisanal" }],
    services: ["Pains au levain", "Viennoiseries", "Pâtisseries maison", "Sandwichs & snacking", "Commandes spéciales", "Gâteaux sur mesure"],
    heroTitle: (nom, ville) => `${nom} — Boulangerie artisanale à ${ville}`,
    heroSub: "Pains · Viennoiseries · Pâtisseries · Faits chaque matin",
  };

  if (a.match(/menuisier|menuiserie|charpentier|charpente|ébéniste/)) return {
    palette: { primary: "#211408", accent: "#8b5e3c", bg: "#f9f5ef", surface: "#ede4d6", text: "#211408" },
    style: "artisan-bois", fontDisplay: "Libre Baskerville", fontBody: "Open Sans",
    fonts: { display: "Libre+Baskerville:wght@400;700", body: "Open+Sans:wght@400;600" },
    heroTag: "Bois massif · Sur-mesure · Fabrication locale",
    ambiance: "Brun foncé et sable. Texture bois en CSS. Galerie asymétrique. Authenticité et fait-main.",
    stats: [{ val: "20", unit: "ans", label: "de métier" }, { val: "100%", unit: "", label: "sur mesure" }, { val: "500+", unit: "", label: "réalisations" }, { val: "Local", unit: "", label: "Flandre intérieure" }],
    services: ["Agencement intérieur", "Escaliers sur mesure", "Terrasses & bardage", "Menuiseries extérieures", "Meubles sur mesure", "Charpente & ossature"],
    heroTitle: (nom, ville) => `Menuiserie ${nom} à ${ville}`,
    heroSub: "Agencement · Escaliers · Terrasses · 100% sur mesure",
  };

  if (a.match(/peintre|peinture|ravalement|décoration/)) return {
    palette: { primary: "#141420", accent: "#e8403a", bg: "#ffffff", surface: "#f5f5f8", text: "#141420" },
    style: "creatif-moderne", fontDisplay: "Oswald", fontBody: "Raleway",
    fonts: { display: "Oswald:wght@500;600;700", body: "Raleway:wght@400;500;600" },
    heroTag: "Intérieur · Extérieur · Ravalement · Décoration",
    ambiance: "Blanc lumineux + rouge accent. Avant/après split. Transitions fluides. Badge garantie.",
    stats: [{ val: "12", unit: "ans", label: "d'expérience" }, { val: "400+", unit: "", label: "chantiers" }, { val: "100%", unit: "", label: "satisfait ou repris" }, { val: "4.9", unit: "/5", label: "avis clients" }],
    services: ["Peinture intérieure", "Peinture extérieure", "Ravalement de façade", "Décoration & enduits", "Isolation thermique", "Nettoyage haute pression"],
    heroTitle: (nom, ville) => `${nom} — Peintre artisan à ${ville}`,
    heroSub: "Intérieur · Extérieur · Ravalement · Devis gratuit sous 48h",
  };

  // Generic fallback
  return {
    palette: { primary: "#162032", accent: "#2e7d5e", bg: "#f8faf9", surface: "#eaf2ee", text: "#162032" },
    style: "professionnel-moderne", fontDisplay: "DM Serif Display", fontBody: "DM Sans",
    fonts: { display: "DM+Serif+Display", body: "DM+Sans:wght@400;500;600" },
    heroTag: "Expertise locale · Qualité garantie · Devis gratuit",
    ambiance: "Bleu marine et vert forêt. Design aéré. Focus confiance et proximité locale.",
    stats: [{ val: "10+", unit: "ans", label: "d'expérience" }, { val: "200+", unit: "", label: "clients satisfaits" }, { val: "Local", unit: "", label: "Nord-Pas-de-Calais" }, { val: "4.8", unit: "/5", label: "satisfaction" }],
    services: ["Service principal 1", "Service principal 2", "Service principal 3", "Service principal 4", "Conseil & devis", "Intervention rapide"],
    heroTitle: (nom, ville) => `${nom} — Expert à ${ville}`,
    heroSub: "Qualité · Réactivité · Proximité · Devis gratuit",
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd crm && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `design-direction.ts`.

- [ ] **Step 3: Commit**

```bash
cd crm && git add src/lib/design-direction.ts && git commit -m "feat(pipeline): add design-direction.ts — ported from prospect.js"
```

---

## Task 4: Maquette and email prompt libraries

**Files:**
- Create: `crm/src/lib/prompts/maquette.ts`
- Create: `crm/src/lib/prompts/email.ts`

- [ ] **Step 1: Create prompts directory and maquette.ts**

```bash
mkdir -p crm/src/lib/prompts
```

Create `crm/src/lib/prompts/maquette.ts`:

```typescript
// crm/src/lib/prompts/maquette.ts
import type { DesignDirection } from "@/lib/design-direction";

export interface ProspectForMaquette {
  nom: string;
  activite: string;
  ville: string;
  telephone: string | null;
  email: string | null;
  siteUrl: string | null;
  statut: string;
  argumentCommercial: string | null;
}

export function getSystemPrompt(): string {
  return `Tu es un designer-développeur senior. Tu crées des sites vitrines one-file HTML pour TPE et artisans locaux français. L'objectif : provoquer un effet "wow" immédiat quand l'artisan ouvre le lien.

FORMAT : Un seul fichier HTML complet (CSS + JS inline). Commence directement par <!DOCTYPE html>. Aucune explication, aucun markdown, aucun backtick.

═══════════════════════════════════════
NIVEAU 1 — CRITIQUE (le site est cassé sans ça)
═══════════════════════════════════════

Structure obligatoire dans cet ordre :
1. Nav sticky (backdrop-filter blur au scroll, hamburger mobile animé avec overlay + fermeture clic extérieur)
2. Hero (min-height: 100dvh, fond travaillé — JAMAIS un fond uni)
3. Stats / chiffres clés (compteurs animés au scroll)
4. Services (grille responsive, icônes SVG inline)
5. À propos (2 colonnes asymétriques, ancrage local)
6. Témoignages (3 avis fictifs, prénoms nordistes : Jean-Marie, Martine, Sandrine...)
7. Contact (formulaire avec validation JS + coordonnées + horaires)
8. Footer (copyright + "Site réalisé par Benjamin Bourger — Steenvoorde")

Technique :
- Toutes les couleurs via CSS custom properties dans :root
- Toutes les tailles de texte en clamp() — zéro px fixe
- Mobile-first : responsive parfait 375px / 768px / 1280px
- Touch targets min 44×44px
- Zéro Lorem ipsum — tout le contenu est réaliste et adapté au métier
- Numéro de téléphone cliquable (href="tel:") visible dans le hero
- Le <script> en fin de body est VITAL — sans lui les éléments restent à opacity:0

JavaScript minimum requis dans le <script> :
- DOMContentLoaded → ajouter .animate sur les éléments du hero (opacity 0→1)
- Intersection Observer fade-up (translateY 40px→0, opacity 0→1) sur toutes les sections
- Compteurs animés (requestAnimationFrame + easeOutQuart)
- Nav scroll (class .scrolled au scroll) + hamburger complet
- Formulaire : preventDefault, validation basique, loading state, message succès
- Smooth scroll sur les ancres

═══════════════════════════════════════
NIVEAU 2 — ATTENDU (90% des runs doivent l'inclure)
═══════════════════════════════════════

- Stagger sur les animations du hero (badge 0.2s, titre 0.4s, sous-titre 0.6s, CTAs 0.8s)
- Stagger sur les groupes de cards (délai 0.1s entre chaque enfant)
- Hover lift sur les cards services (translateY -4px + shadow + border-top accent)
- Underline slide sur les liens de navigation (::after scale 0→1)
- Chaque section a un layout visuellement distinct des autres (alterner fond, disposition, asymétrie)
- Ripple ou shimmer sur les CTAs principaux
- Bouton "retour en haut" après 300px de scroll

═══════════════════════════════════════
NIVEAU 3 — EFFET WOW (choisir 3-4 parmi cette liste, selon ce qui colle au métier)
═══════════════════════════════════════

Choisis les effets qui renforcent l'ambiance du secteur. Ne les mets PAS tous.

- Aurora/Mesh gradient animé en fond du hero (3 couleurs de la palette, @keyframes sur background-position)
- Scramble text sur le titre hero (caractères aléatoires → texte final, JS pur)
- Typewriter sur le sous-titre (curseur clignotant)
- Tilt 3D sur les cards (rotation max 8deg selon position curseur, perspective 1000px)
- Glassmorphism sur les cards témoignages (backdrop-filter blur, fond rgba, border subtle)
- Floating particles en arrière-plan du hero (cercles CSS animés à des vitesses différentes)
- Parallax léger sur les fonds de section (translateY proportionnel au scroll, rAF)
- Gradient text animé sur un élément d'accroche (background-clip: text)
- Glow hover sur les cards (box-shadow colorée au survol)
- Noise texture subtile en overlay (SVG filter feTurbulence)

═══════════════════════════════════════
IMAGES — une seule règle
═══════════════════════════════════════

Pas d'images externes (pas d'Unsplash, pas de picsum, pas de placeholder gris).
Pour chaque emplacement image : un SVG inline cohérent avec le métier et la palette.
Icônes de services : SVG inline simples, stroke ou filled, 48×48px min.
Commentaire sur chaque SVG : <!-- SVG généré — à remplacer par photo réelle -->

═══════════════════════════════════════
IDENTITÉ VISUELLE
═══════════════════════════════════════

Si le prospect a un SITE RÉCENT (< 3 ans, design propre) :
→ Conserver sa palette et son ton, moderniser les détails

Si le prospect a un SITE DATÉ ou est SANS_SITE :
→ Appliquer la direction artistique fournie dans le user prompt

═══════════════════════════════════════
INTERDICTIONS
═══════════════════════════════════════

- Fond uni sans texture/gradient dans le hero
- Layout 3 colonnes égales identiques (le layout générique IA)
- border-radius identique sur tous les éléments
- Emoji dans le contenu
- Texte IA cliché : "Elevate", "Seamless", "Unleash", "Next-Gen"
- 100vh fixe — utiliser min-height: 100dvh
- Images placeholder ou blocs image vides`;
}

export function getUserPrompt(
  prospect: ProspectForMaquette,
  d: DesignDirection
): string {
  const gfUrl = `https://fonts.googleapis.com/css2?family=${d.fonts.display}&family=${d.fonts.body}&display=swap`;

  const siteContext = prospect.siteUrl && prospect.statut !== "SANS_SITE"
    ? `\nSITE ACTUEL : ${prospect.siteUrl} (statut: ${prospect.statut}) — La maquette doit être visuellement supérieure.`
    : prospect.statut === "SANS_SITE"
    ? "\nSTATUT : Prospect SANS SITE — créer une présence professionnelle de zéro."
    : "";

  const argSection = prospect.argumentCommercial
    ? `\nARGUMENT COMMERCIAL : ${prospect.argumentCommercial}`
    : "";

  return `CLIENT : ${prospect.nom} · ${prospect.activite} · ${prospect.ville}
TÉL : ${prospect.telephone ?? "03 XX XX XX XX"}
EMAIL : ${prospect.email ?? `contact@${prospect.nom.toLowerCase().replace(/[^a-z]/g, "")}.fr`}

DIRECTION ARTISTIQUE : ${d.style}
${d.ambiance}
Font display : "${d.fontDisplay}" — body : "${d.fontBody}"
Google Fonts : ${gfUrl}

:root {
  --primary:${d.palette.primary}; --accent:${d.palette.accent};
  --bg:${d.palette.bg}; --surface:${d.palette.surface}; --text:${d.palette.text};
  --white:#fff; --radius:8px; --shadow:0 4px 24px rgba(0,0,0,0.10);
  --transition:0.3s cubic-bezier(0.4,0,0.2,1);
}

HERO :
  H1 : "${d.heroTitle(prospect.nom, prospect.ville)}"
  Sous-titre : "${d.heroSub}"
  Badge : "${d.heroTag}"
  CTAs : [Demander un devis] bg accent + [Nous appeler] outline

STATS : ${d.stats.map(s => `"${s.val}${s.unit}" ${s.label}`).join(" · ")}

SERVICES : ${d.services.join(" · ")}

TÉMOIGNAGES : 3 avis fictifs nordistes avec étoiles, guillemets «», prénom + ville
${siteContext}${argSection}
Commence par <!DOCTYPE html>.`;
}
```

- [ ] **Step 2: Create `crm/src/lib/prompts/email.ts`**

```typescript
// crm/src/lib/prompts/email.ts

export interface EmailContext {
  nom: string;
  activite: string;
  ville: string;
  statut: string;
  argumentCommercial: string | null;
  telephone: string | null;
  siteUrl: string | null;
  demoUrl: string | null;
  benjaminTel: string | null;
  benjaminEmail: string | null;
}

export function getEmailPrompt(ctx: EmailContext): string {
  const { nom, activite, ville, statut, argumentCommercial, telephone, siteUrl, demoUrl, benjaminTel, benjaminEmail } = ctx;

  const statutDesc = statut === "SANS_SITE"
    ? "Ce prospect n'a pas de site web."
    : statut === "SITE_OBSOLETE"
    ? `Ce prospect a un site web obsolète (${siteUrl ?? "URL inconnue"}).`
    : `Ce prospect a un site web basique qui manque de conversion (${siteUrl ?? "URL inconnue"}).`;

  const demoSection = demoUrl
    ? `Une maquette de site professionnel a été préparée spécifiquement pour ce prospect : ${demoUrl}`
    : "Précise que tu peux préparer une maquette de site sur mesure sur simple demande.";

  return `Rédige un email de prospection commerciale pour contacter ${nom}, ${activite} à ${ville}.

CONTEXTE :
- ${statutDesc}
- Argument commercial identifié : ${argumentCommercial ?? "Améliorer sa visibilité locale en ligne"}
- ${demoSection}

RÈGLES IMPÉRATIVES :
- Ton : direct, professionnel, jamais "je me permets de vous contacter" ni "suite à nos recherches"
- Longueur : 4-6 phrases corps maximum, pas de paragraphe superflu
- Accroche : ouvre sur un constat spécifique à la situation du prospect (statut web + argument commercial), pas une formule générique
- CTA unique et clair : appel téléphonique ou réponse email, PAS de lien Calendly
- Signature : Benjamin Bourger — Steenvoorde${benjaminTel ? ` — ${benjaminTel}` : ""}${benjaminEmail ? ` — ${benjaminEmail}` : ""}
- PAS d'emoji, PAS de majuscules excessives

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "sujet": "objet de l'email court et percutant",
  "corps": "corps de l'email complet avec retours à la ligne sous forme \\n"
}`;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd crm && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd crm && git add src/lib/prompts/ && git commit -m "feat(pipeline): add maquette + email Claude prompts"
```

---

## Task 5: Netlify deploy utility

**Files:**
- Create: `crm/src/lib/netlify-deploy.ts`

- [ ] **Step 1: Create `crm/src/lib/netlify-deploy.ts`**

```typescript
// crm/src/lib/netlify-deploy.ts
import JSZip from "jszip";

export interface NetlifyDeployResult {
  siteId: string;
  url: string;
}

export async function deployToNetlify(
  html: string,
  prospectNom: string,
  prospectVille: string
): Promise<NetlifyDeployResult> {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error("NETLIFY_TOKEN manquant");

  // Build a unique site name: max 60 chars, only a-z0-9-
  const base = `${prospectNom}-${prospectVille}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 6);
  const siteName = `${base}-${suffix}`;

  // 1. Create Netlify site
  const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: siteName }),
  });
  if (!siteRes.ok) {
    const err = await siteRes.text();
    throw new Error(`Netlify create site failed (${siteRes.status}): ${err.slice(0, 200)}`);
  }
  const site = (await siteRes.json()) as { id: string; url: string };

  // 2. Create ZIP with index.html
  const zip = new JSZip();
  zip.file("index.html", html);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  // 3. Deploy ZIP
  const deployRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${site.id}/deploys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: buffer,
    }
  );
  if (!deployRes.ok) {
    const err = await deployRes.text();
    throw new Error(`Netlify deploy failed (${deployRes.status}): ${err.slice(0, 200)}`);
  }

  return { siteId: site.id, url: site.url };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd crm && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd crm && git add src/lib/netlify-deploy.ts && git commit -m "feat(pipeline): add netlify-deploy.ts — ZIP deploy via REST API"
```

---

## Task 6: Prospection search SSE endpoint

**Files:**
- Create: `crm/src/app/api/prospection/search/route.ts`

This replaces the old `start/route.ts` + `[jobId]/stream/route.ts` pair. It streams results directly via SSE.

- [ ] **Step 1: Create `crm/src/app/api/prospection/search/route.ts`**

```typescript
// crm/src/app/api/prospection/search/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { placesTextSearch, placesDetails } from "@/lib/places";
import { db } from "@/lib/db";

const MAX_PLACES = 10;
const MAX_CONTENT_SLICE = 3000;

export interface SearchProspect {
  nom: string;
  activite: string;
  ville: string;
  telephone: string | null;
  email: string | null;
  siteUrl: string | null;
  adresse: string | null;
  noteGoogle: number | null;
  statut: string;
  priorite: string;
  raison: string | null;
  argumentCommercial: string | null;
  alreadyInCrm: boolean;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q || q.length > 200) {
    return new Response(JSON.stringify({ error: "q requis, max 200 chars" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Step 1: Google Places
        send({ type: "status", step: "places", message: "Recherche Google Places..." });
        const places = await placesTextSearch(q);
        if (!places.length) {
          send({ type: "error", message: "Aucun résultat Google Places pour cette requête." });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        send({ type: "status", step: "places", message: `${places.length} entreprises trouvées — enrichissement...` });

        // Step 2: Details enrichment (batches of 3)
        const enriched: Array<{
          nom: string;
          adresse: string;
          rating: number | null;
          telephone: string | null;
          website: string | null;
          types: string[];
        }> = [];
        const toProcess = places.slice(0, MAX_PLACES);
        for (let i = 0; i < toProcess.length; i += 3) {
          const batch = toProcess.slice(i, i + 3);
          const results = await Promise.all(
            batch.map(async (place) => {
              const details = await placesDetails(place.place_id);
              return {
                nom: place.name,
                adresse: place.formatted_address,
                rating: place.rating ?? null,
                telephone: details?.formatted_phone_number ?? null,
                website: details?.website ?? null,
                types: place.types,
              };
            })
          );
          enriched.push(...results);
          send({
            type: "status",
            step: "details",
            message: `Enrichissement ${Math.min(i + 3, toProcess.length)}/${toProcess.length}...`,
          });
        }

        // Step 3: Claude classification
        send({ type: "status", step: "analyse", message: "Analyse IA en cours..." });

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const date = new Date().toISOString().split("T")[0];

        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: `Expert commercial en vente de sites web aux TPE/artisans locaux France, secteur Steenvoorde (Nord).
Statuts : SANS_SITE (aucune URL propre), SITE_OBSOLETE (HTTP / design pré-2018 / non-mobile détectable dans le contenu), SITE_BASIQUE (site présent mais incomplet), SITE_CORRECT (ne pas inclure — pas de valeur commerciale).
Réponds UNIQUEMENT en JSON valide, sans markdown.`,
          messages: [{
            role: "user",
            content: `Voici les entreprises trouvées via Google Places pour la requête "${q}" dans la région Steenvoorde/Nord.
Pour chaque entreprise, détermine son statut web, sa priorité commerciale et génère un argument d'accroche personnalisé.
Ignore SITE_CORRECT (aucune valeur commerciale pour nous).

DONNÉES BRUTES :
${JSON.stringify(enriched.slice(0, MAX_CONTENT_SLICE), null, 2).slice(0, 8000)}

Réponds UNIQUEMENT en JSON valide :
{
  "prospects": [{
    "nom": "...",
    "activite": "type d'activité précis",
    "ville": "...",
    "telephone": "0X XX XX XX XX ou null",
    "email": "... ou null",
    "site_url": "URL ou null",
    "adresse": "adresse complète",
    "noteGoogle": 4.2,
    "statut": "SANS_SITE|SITE_OBSOLETE|SITE_BASIQUE",
    "priorite": "HAUTE|MOYENNE|FAIBLE",
    "raison": "explication courte du statut",
    "argument_commercial": "phrase d'accroche personnalisée"
  }]
}`,
          }],
        });

        const text = response.content.find(b => b.type === "text")?.text ?? "";
        const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let parsed: { prospects?: Array<{
          nom: string; activite: string; ville: string;
          telephone?: string | null; email?: string | null;
          site_url?: string | null; adresse?: string | null;
          noteGoogle?: number | null; statut: string; priorite: string;
          raison?: string | null; argument_commercial?: string | null;
        }> } | null = null;

        try {
          parsed = JSON.parse(clean);
        } catch {
          const match = clean.match(/\{[\s\S]*\}/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch { /* */ }
          }
        }

        if (!parsed?.prospects?.length) {
          send({ type: "error", message: "Impossible de parser la réponse Claude." });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // Step 4: Check which are already in CRM, emit each result
        let emitCount = 0;
        for (const p of parsed.prospects) {
          if (!p.nom || !p.ville) continue;
          const existing = await db.prospect.findFirst({
            where: { nom: p.nom, ville: p.ville },
            select: { id: true },
          });
          const prospect: SearchProspect = {
            nom: p.nom,
            activite: p.activite ?? q,
            ville: p.ville,
            telephone: p.telephone ?? null,
            email: p.email ?? null,
            siteUrl: p.site_url ?? null,
            adresse: p.adresse ?? null,
            noteGoogle: p.noteGoogle ?? null,
            statut: p.statut,
            priorite: p.priorite,
            raison: p.raison ?? null,
            argumentCommercial: p.argument_commercial ?? null,
            alreadyInCrm: !!existing,
          };
          send({ type: "prospect", ...prospect });
          emitCount++;
        }

        // Save to Recherche history
        await db.recherche.create({
          data: {
            query: q,
            resultatsCount: emitCount,
            prospectsAjoutes: 0,
            date: new Date(),
          },
        });

      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd crm && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the new file.

- [ ] **Step 3: Test the endpoint manually (requires GOOGLE_PLACES_KEY + ANTHROPIC_API_KEY in .env)**

```bash
cd crm && npm run dev &
# In another terminal:
curl -N "http://localhost:3000/api/prospection/search?q=plombier+Steenvoorde" \
  -H "Cookie: session=<your-session-token>"
```

Expected: stream of `data: {...}` lines ending with `data: [DONE]`.

- [ ] **Step 4: Commit**

```bash
cd crm && git add src/app/api/prospection/search/ && git commit -m "feat(pipeline): add /api/prospection/search SSE endpoint — replaces spawn-based pipeline"
```

---

## Task 7: Maquette generation endpoint

**Files:**
- Create: `crm/src/app/api/maquettes/generate/route.ts`

- [ ] **Step 1: Create `crm/src/app/api/maquettes/generate/route.ts`**

```typescript
// crm/src/app/api/maquettes/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDesignDirection } from "@/lib/design-direction";
import { getSystemPrompt, getUserPrompt } from "@/lib/prompts/maquette";
import { deployToNetlify } from "@/lib/netlify-deploy";

// Allow up to 5 minutes (Vercel Pro). Hobby plan caps at 60s.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { prospectId } = body;

  if (!prospectId || typeof prospectId !== "string") {
    return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
  }

  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: {
      id: true,
      nom: true,
      activite: true,
      ville: true,
      telephone: true,
      email: true,
      siteUrl: true,
      statut: true,
      argumentCommercial: true,
    },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  }

  // Generate HTML via Claude
  const d = getDesignDirection(prospect.activite);
  const system = getSystemPrompt();
  const user = getUserPrompt(prospect, d);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
  });

  let html = (response.content.find(b => b.type === "text")?.text ?? "").trim();
  if (!html.startsWith("<!")) {
    // Claude may have added a preamble — strip it
    const idx = html.indexOf("<!DOCTYPE");
    if (idx > 0) html = html.slice(idx);
  }

  if (!html) {
    return NextResponse.json({ error: "Génération HTML échouée" }, { status: 500 });
  }

  // Deploy to Netlify
  let demoUrl: string | null = null;
  let netlifySiteId: string | null = null;
  try {
    const deployed = await deployToNetlify(html, prospect.nom, prospect.ville);
    demoUrl = deployed.url;
    netlifySiteId = deployed.siteId;
  } catch (err) {
    console.error("[maquettes/generate] Netlify deploy failed:", err);
    // Continue without demo URL — HTML is saved in DB
  }

  // Save to DB (upsert: one maquette per prospect for simplicity)
  const maquette = await db.maquette.upsert({
    where: {
      // Need a unique constraint — see note below
      id: (await db.maquette.findFirst({
        where: { prospectId, type: "html" },
        select: { id: true },
      }))?.id ?? "new-does-not-exist",
    },
    create: {
      prospectId,
      type: "html",
      html,
      demoUrl,
      netlifySiteId,
      statut: demoUrl ? "ENVOYE" : "BROUILLON",
    },
    update: {
      html,
      demoUrl,
      netlifySiteId,
      statut: demoUrl ? "ENVOYE" : "BROUILLON",
      updatedAt: new Date(),
    },
  });

  // Log activity
  await db.activite.create({
    data: {
      prospectId,
      type: "NOTE",
      description: `Maquette générée${demoUrl ? ` — démo : ${demoUrl}` : " (sans déploiement Netlify)"}`,
    },
  });

  return NextResponse.json({
    id: maquette.id,
    demoUrl: maquette.demoUrl,
    statut: maquette.statut,
    prospectId,
  });
}
```

**Note on upsert:** The upsert above uses a find-first to get existing ID. This is a two-query pattern to avoid needing a unique index on `(prospectId, type)`. If the Prisma schema is later updated to add `@@unique([prospectId, type])`, replace with a direct upsert.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd crm && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd crm && git add src/app/api/maquettes/generate/ && git commit -m "feat(pipeline): add /api/maquettes/generate — Claude HTML + Netlify REST deploy"
```

---

## Task 8: Email generation endpoint

**Files:**
- Create: `crm/src/app/api/prospects/[id]/email/route.ts`

- [ ] **Step 1: Create directory and route**

```bash
mkdir -p "crm/src/app/api/prospects/[id]/email"
```

Create `crm/src/app/api/prospects/[id]/email/route.ts`:

```typescript
// crm/src/app/api/prospects/[id]/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmailPrompt } from "@/lib/prompts/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      maquettes: {
        select: { demoUrl: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  }

  // Fetch Benjamin's contact info from Parametre
  const [telParam, emailParam] = await Promise.all([
    db.parametre.findUnique({ where: { cle: "profil_telephone" } }),
    db.parametre.findUnique({ where: { cle: "profil_email" } }),
  ]);

  const demoUrl = prospect.maquettes[0]?.demoUrl ?? null;

  const prompt = getEmailPrompt({
    nom: prospect.nom,
    activite: prospect.activite,
    ville: prospect.ville,
    statut: prospect.statut,
    argumentCommercial: prospect.argumentCommercial,
    telephone: prospect.telephone,
    siteUrl: prospect.siteUrl,
    demoUrl,
    benjaminTel: telParam?.valeur ?? null,
    benjaminEmail: emailParam?.valeur ?? null,
  });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (response.content.find(b => b.type === "text")?.text ?? "").trim();
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let parsed: { sujet?: string; corps?: string } | null = null;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { /* */ } }
  }

  if (!parsed?.sujet || !parsed?.corps) {
    return NextResponse.json({ error: "Génération email échouée" }, { status: 500 });
  }

  return NextResponse.json({ sujet: parsed.sujet, corps: parsed.corps });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd crm && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd crm && git add "src/app/api/prospects/[id]/email/" && git commit -m "feat(pipeline): add /api/prospects/[id]/email — Claude email generation"
```

---

## Task 9: Redesign prospection page + search result component

**Files:**
- Create: `crm/src/components/prospection/search-result-card.tsx`
- Modify: `crm/src/app/(dashboard)/prospection/page.tsx`
- Modify: `crm/src/components/prospection/prospection-search-panel.tsx`
- Modify: `crm/src/components/prospection/prospection-results-panel.tsx`

- [ ] **Step 1: Create `crm/src/components/prospection/search-result-card.tsx`**

```typescript
// crm/src/components/prospection/search-result-card.tsx
"use client";

import { useState } from "react";
import { MapPin, Phone, Globe, Star } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface SearchResultCardProps {
  prospect: SearchProspect;
  isTop?: boolean;
}

export function SearchResultCard({ prospect, isTop = false }: SearchResultCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(prospect.alreadyInCrm);

  async function handleAdd() {
    if (added || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: prospect.nom,
          activite: prospect.activite,
          ville: prospect.ville,
          telephone: prospect.telephone,
          email: prospect.email,
          siteUrl: prospect.siteUrl,
          adresse: prospect.adresse,
          noteGoogle: prospect.noteGoogle,
          statut: prospect.statut,
          priorite: prospect.priorite,
          raison: prospect.raison,
          argumentCommercial: prospect.argumentCommercial,
          source: "PROSPECTION",
        }),
      });
      if (res.ok) setAdded(true);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className={cn("rounded-xl p-4", isTop ? "glass-violet" : "glass")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{prospect.nom}</span>
            <StatusBadge type="priorite" value={prospect.priorite} />
            <StatusBadge type="statut" value={prospect.statut} />
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            {prospect.activite} · {prospect.ville}
          </p>
        </div>
        {added ? (
          <span className="shrink-0 text-[0.65rem] font-medium text-green-400 bg-green-400/10 border border-green-400/25 rounded px-2 py-0.5">
            ✓ Dans le CRM
          </span>
        ) : null}
      </div>

      {/* Contact details */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-black/20 rounded-lg p-3">
        {prospect.adresse && (
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <p className="text-[0.7rem] text-white/70 truncate">{prospect.adresse}</p>
          </div>
        )}
        {prospect.telephone && (
          <div className="flex items-start gap-1.5">
            <Phone className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <p className="text-[0.7rem] text-white/70">{prospect.telephone}</p>
          </div>
        )}
        {prospect.siteUrl && (
          <div className="flex items-start gap-1.5">
            <Globe className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <a
              href={prospect.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.7rem] text-yellow-400 truncate hover:underline"
            >
              {prospect.siteUrl.replace(/^https?:\/\//, "").slice(0, 35)}
            </a>
          </div>
        )}
        {prospect.noteGoogle != null && (
          <div className="flex items-start gap-1.5">
            <Star className="w-3 h-3 text-white/40 mt-0.5 shrink-0" />
            <p className="text-[0.7rem] text-white/70">{prospect.noteGoogle} / 5</p>
          </div>
        )}
      </div>

      {/* Argument commercial */}
      {prospect.argumentCommercial && (
        <div className="border-l-2 border-violet-400/40 pl-3 py-1 mb-3 bg-violet-500/5 rounded-r">
          <p className="text-[0.65rem] text-violet-300 uppercase tracking-wide mb-0.5">
            Argument commercial
          </p>
          <p className="text-xs text-slate-300 italic">
            &ldquo;{prospect.argumentCommercial}&rdquo;
          </p>
        </div>
      )}

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={added || adding}
        className={cn(
          "w-full rounded-lg py-2 text-xs font-semibold transition-colors",
          added
            ? "bg-green-500/10 border border-green-500/25 text-green-400 cursor-default"
            : adding
            ? "bg-violet-500/20 border border-violet-400/30 text-violet-300 cursor-wait opacity-70"
            : "bg-gradient-to-r from-violet-600 to-indigo-500 text-white hover:from-violet-500 hover:to-indigo-400"
        )}
      >
        {added ? "✓ Ajouté au CRM" : adding ? "Ajout en cours..." : "➕ Ajouter au CRM"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update `prospection-search-panel.tsx` — remove mode selector**

Replace the full content of `crm/src/components/prospection/prospection-search-panel.tsx` with:

```typescript
// crm/src/components/prospection/prospection-search-panel.tsx
"use client";

import { cn } from "@/lib/utils";

interface SearchHistory {
  id: string;
  query: string;
  resultatsCount: number;
  date: string;
}

interface ProspectionSearchPanelProps {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
  history: SearchHistory[];
  onHistoryClick: (query: string) => void;
}

export function ProspectionSearchPanel({
  query,
  onQueryChange,
  onSubmit,
  isRunning,
  history,
  onHistoryClick,
}: ProspectionSearchPanelProps) {
  return (
    <div className="glass-violet rounded-xl p-4 flex flex-col gap-4 h-full">
      <p className="text-[0.65rem] text-violet-300 uppercase tracking-widest font-semibold">
        Recherche de prospects
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !isRunning && onSubmit()}
        placeholder="boulanger Steenvoorde"
        className="w-full bg-white/6 border border-violet-400/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60 transition-colors"
        disabled={isRunning}
      />

      <button
        onClick={onSubmit}
        disabled={isRunning || !query.trim()}
        className={cn(
          "w-full rounded-lg py-2.5 text-sm font-bold text-white transition-all",
          isRunning || !query.trim()
            ? "bg-violet-500/30 cursor-not-allowed opacity-60"
            : "bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 shadow-lg shadow-violet-500/20"
        )}
      >
        {isRunning ? "⟳ Recherche en cours…" : "▶ Lancer la recherche"}
      </button>

      {history.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-white/6 pt-4 mt-auto">
          <p className="text-[0.6rem] text-white/30 uppercase tracking-wide mb-1">
            Historique
          </p>
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => onHistoryClick(h.query)}
              disabled={isRunning}
              className="text-left text-xs text-violet-300 px-2 py-1.5 bg-violet-500/6 hover:bg-violet-500/12 rounded transition-colors truncate"
              title={h.query}
            >
              &ldquo;{h.query}&rdquo; · {h.resultatsCount} résultats
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `prospection-results-panel.tsx`**

Replace the full content of `crm/src/components/prospection/prospection-results-panel.tsx` with:

```typescript
// crm/src/components/prospection/prospection-results-panel.tsx
"use client";

import Link from "next/link";
import { SearchResultCard } from "./search-result-card";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface ProspectionResultsPanelProps {
  status: "idle" | "running" | "done" | "error";
  statusMessage: string;
  results: SearchProspect[];
  query: string;
  error?: string;
}

export function ProspectionResultsPanel({
  status,
  statusMessage,
  results,
  query,
  error,
}: ProspectionResultsPanelProps) {
  if (status === "idle") {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <p className="text-sm text-white/30">
          Lancez une recherche pour trouver des prospects
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Status indicator */}
      {status === "running" && (
        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
          <p className="text-xs text-white/60">{statusMessage || "Analyse en cours…"}</p>
        </div>
      )}

      {status === "error" && error && (
        <div className="glass-danger rounded-xl p-4">
          <p className="text-sm text-red-400 font-medium">Erreur</p>
          <p className="text-xs text-red-300/70 mt-1">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50 font-medium">
            {results.length} prospect{results.length > 1 ? "s" : ""} — &ldquo;{query}&rdquo;
          </span>
          <Link
            href="/prospects"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Voir dans Prospects →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {results.map((prospect, i) => (
          <SearchResultCard
            key={`${prospect.nom}-${prospect.ville}`}
            prospect={prospect}
            isTop={i === 0 && prospect.priorite === "HAUTE"}
          />
        ))}
      </div>

      {status === "running" && results.length === 0 && (
        <div className="glass rounded-xl p-6 flex items-center justify-center">
          <p className="text-sm text-white/40 animate-pulse">
            Analyse en cours…
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `crm/src/app/(dashboard)/prospection/page.tsx`**

Replace the full content with:

```typescript
// crm/src/app/(dashboard)/prospection/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ProspectionSearchPanel } from "@/components/prospection/prospection-search-panel";
import { ProspectionResultsPanel } from "@/components/prospection/prospection-results-panel";
import type { SearchProspect } from "@/app/api/prospection/search/route";

interface SearchHistory {
  id: string;
  query: string;
  resultatsCount: number;
  date: string;
}

export default function ProspectionPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState<SearchProspect[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [history, setHistory] = useState<SearchHistory[]>([]);

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/prospection/history")
      .then((r) => r.json())
      .then(setHistory)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (status === "done") {
      fetch("/api/prospection/history")
        .then((r) => r.json())
        .then(setHistory)
        .catch(console.error);
    }
  }, [status]);

  function handleSubmit() {
    if (!query.trim() || status === "running") return;

    esRef.current?.close();
    esRef.current = null;

    setStatus("running");
    setStatusMessage("Connexion...");
    setResults([]);
    setError(undefined);
    setActiveQuery(query.trim());

    const es = new EventSource(
      `/api/prospection/search?q=${encodeURIComponent(query.trim())}`
    );
    esRef.current = es;

    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        setStatus("done");
        es.close();
        esRef.current = null;
        return;
      }
      try {
        const data = JSON.parse(e.data) as {
          type: string;
          message?: string;
          step?: string;
        } & Partial<SearchProspect>;

        if (data.type === "status" && data.message) {
          setStatusMessage(data.message);
        } else if (data.type === "prospect") {
          const { type: _, ...prospect } = data;
          setResults((prev) => [...prev, prospect as SearchProspect]);
        } else if (data.type === "error" && data.message) {
          setStatus("error");
          setError(data.message);
          es.close();
          esRef.current = null;
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      if (status !== "done") {
        setStatus("error");
        setError("Connexion SSE perdue");
      }
      es.close();
      esRef.current = null;
    };
  }

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  return (
    <div className="flex gap-5 h-full min-h-[calc(100vh-120px)] flex-col">
      <div className="flex gap-5 h-full">
        <div className="w-72 shrink-0">
          <ProspectionSearchPanel
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            isRunning={status === "running"}
            history={history}
            onHistoryClick={(q) => setQuery(q)}
          />
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">
          <ProspectionResultsPanel
            status={status}
            statusMessage={statusMessage}
            results={results}
            query={activeQuery}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
cd crm && npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 6: Commit**

```bash
cd crm && git add src/app/(dashboard)/prospection/ src/components/prospection/ && git commit -m "feat(pipeline): redesign prospection page — SSE search with Add-to-CRM results"
```

---

## Task 10: Maquette + email sections on prospect detail page

**Files:**
- Modify: `crm/src/app/(dashboard)/prospects/[id]/page.tsx`

We need to add two client-interactive sections. We'll create two small inline client components as separate files.

- [ ] **Step 1: Create `crm/src/components/prospects/maquette-section.tsx`**

```typescript
// crm/src/components/prospects/maquette-section.tsx
"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface MaquetteData {
  id: string;
  demoUrl: string | null;
  statut: string;
}

interface MaquetteSectionProps {
  prospectId: string;
  initialMaquette: MaquetteData | null;
}

export function MaquetteSection({ prospectId, initialMaquette }: MaquetteSectionProps) {
  const [maquette, setMaquette] = useState<MaquetteData | null>(initialMaquette);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/maquettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        toast.error(err.error ?? "Génération échouée");
        return;
      }
      const data = await res.json() as MaquetteData;
      setMaquette(data);
      toast.success(data.demoUrl ? "Maquette générée et déployée !" : "Maquette générée (sans déploiement)");
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maquette</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {maquette?.demoUrl && (
          <a
            href={maquette.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Voir la démo
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-60 disabled:cursor-wait transition-all"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading
            ? "Génération en cours (~30s)…"
            : maquette
            ? "🔄 Regénérer"
            : "🎨 Générer la maquette"}
        </button>
        {loading && (
          <p className="text-xs text-white/40">
            Claude génère le HTML complet… cela peut prendre jusqu&apos;à 60 secondes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `crm/src/components/prospects/email-section.tsx`**

```typescript
// crm/src/components/prospects/email-section.tsx
"use client";

import { useState } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface EmailSectionProps {
  prospectId: string;
}

export function EmailSection({ prospectId }: EmailSectionProps) {
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/email`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Génération email échouée");
        return;
      }
      const data = await res.json() as { sujet: string; corps: string };
      setSujet(data.sujet);
      setCorps(data.corps);
    } catch {
      toast.error("Erreur réseau — réessayez");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copié`))
      .catch(() => toast.error("Impossible de copier"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email de prospection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sujet && !loading && (
          <button
            onClick={generate}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 transition-all"
          >
            ✉️ Générer l&apos;email
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération en cours…
          </div>
        )}

        {sujet && (
          <>
            {/* Subject */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">Objet</p>
                <button
                  onClick={() => copy(sujet, "Objet")}
                  className="flex items-center gap-1 text-[0.65rem] text-violet-400 hover:text-violet-300"
                >
                  <Copy className="w-3 h-3" /> Copier
                </button>
              </div>
              <p className="text-sm text-white bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                {sujet}
              </p>
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] text-white/40 uppercase tracking-wide">Corps</p>
                <button
                  onClick={() => copy(corps, "Corps")}
                  className="flex items-center gap-1 text-[0.65rem] text-violet-400 hover:text-violet-300"
                >
                  <Copy className="w-3 h-3" /> Copier
                </button>
              </div>
              <pre className="text-xs text-white/80 bg-white/5 rounded-lg px-3 py-2 border border-white/10 whitespace-pre-wrap font-sans leading-relaxed">
                {corps}
              </pre>
            </div>

            {/* Regenerate */}
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Regénérer
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Update `crm/src/app/(dashboard)/prospects/[id]/page.tsx`**

Add imports at the top and add the two new sections in the JSX. Replace the full content:

```typescript
// crm/src/app/(dashboard)/prospects/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProspectHeader } from "@/components/prospects/prospect-header";
import { ProspectTimeline } from "@/components/prospects/prospect-timeline";
import { AddNoteDialog } from "@/components/prospects/add-note-dialog";
import { MaquetteSection } from "@/components/prospects/maquette-section";
import { EmailSection } from "@/components/prospects/email-section";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      maquettes: { orderBy: { createdAt: "desc" } },
      activites: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  if (!prospect) notFound();

  const headerProps = {
    id: prospect.id,
    nom: prospect.nom,
    activite: prospect.activite,
    ville: prospect.ville,
    telephone: prospect.telephone,
    email: prospect.email,
    siteUrl: prospect.siteUrl,
    statut: prospect.statut,
    priorite: prospect.priorite,
    statutPipeline: prospect.statutPipeline,
  };

  const activites = prospect.activites.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    date: a.date.toISOString(),
  }));

  const latestMaquette = prospect.maquettes[0] ?? null;
  const maquetteData = latestMaquette
    ? { id: latestMaquette.id, demoUrl: latestMaquette.demoUrl, statut: latestMaquette.statut }
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/prospects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour aux prospects
      </Link>

      <ProspectHeader {...headerProps} />

      {/* Argument commercial */}
      <Card>
        <CardHeader>
          <CardTitle>Argument commercial</CardTitle>
        </CardHeader>
        <CardContent>
          {prospect.argumentCommercial ? (
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              {prospect.argumentCommercial}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60">
              Aucun argument généré
            </p>
          )}
        </CardContent>
      </Card>

      {/* Maquette + Email + Actions (3 colonnes) */}
      <div className="grid gap-6 md:grid-cols-3">
        <MaquetteSection prospectId={prospect.id} initialMaquette={maquetteData} />
        <EmailSection prospectId={prospect.id} />
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <AddNoteDialog prospectId={prospect.id} />
          </CardContent>
        </Card>
      </div>

      {/* Legacy maquettes list (other maquettes) */}
      {prospect.maquettes.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Autres maquettes ({prospect.maquettes.length - 1})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prospect.maquettes.slice(1).map((maquette) => (
                <div
                  key={maquette.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium uppercase">{maquette.type}</span>
                      <StatusBadge type="pipeline" value={maquette.statut} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {maquette.demoUrl && (
                        <a
                          href={maquette.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Démo <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique d&apos;activité</CardTitle>
        </CardHeader>
        <CardContent>
          <ProspectTimeline activites={activites} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
cd crm && npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
cd crm && git add src/components/prospects/maquette-section.tsx src/components/prospects/email-section.tsx "src/app/(dashboard)/prospects/[id]/page.tsx" && git commit -m "feat(pipeline): add MaquetteSection + EmailSection to prospect detail page"
```

---

## Task 11: Cleanup old files

**Files:**
- Delete: `crm/src/app/api/prospection/start/route.ts`
- Delete: `crm/src/app/api/prospection/[jobId]/stream/route.ts`
- Delete: `crm/src/lib/prospection-jobs.ts`
- Delete: `crm/src/components/prospection/prospection-progress.tsx`
- Delete: `crm/src/components/prospection/prospect-result-card.tsx`

- [ ] **Step 1: Delete old API routes and lib**

```bash
cd crm && rm src/app/api/prospection/start/route.ts
rm -rf "src/app/api/prospection/[jobId]"
rm src/lib/prospection-jobs.ts
rm src/components/prospection/prospection-progress.tsx
rm src/components/prospection/prospect-result-card.tsx
```

- [ ] **Step 2: Remove NEXT_PUBLIC_VERCEL env var reference (was only used for the banner)**

The prospection page no longer references `NEXT_PUBLIC_VERCEL` — verify no remaining references:

```bash
cd crm && grep -r "NEXT_PUBLIC_VERCEL" src/ || echo "OK — no references"
```

Expected: `OK — no references`

If any found, remove them.

- [ ] **Step 3: Verify build with deletions**

```bash
cd crm && npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully`. If there are import errors for deleted files, fix them before proceeding.

- [ ] **Step 4: Commit**

```bash
cd crm && git add -A && git commit -m "chore(pipeline): remove spawn-based pipeline (start, stream, prospection-jobs, progress component)"
```

---

## Task 12: Verify full flow end-to-end

- [ ] **Step 1: Start dev server and run search**

```bash
cd crm && npm run dev
```

Open browser at `http://localhost:3000/prospection`. Log in if needed.

- [ ] **Step 2: Test search flow**

1. Type "plombier Steenvoorde" in the search box
2. Click "Lancer la recherche"
3. Expected: status messages update in real time (Google Places... → Enrichissement... → Analyse IA...)
4. Expected: prospect cards appear one by one
5. Click "Ajouter au CRM" on one prospect
6. Expected: button changes to "✓ Ajouté au CRM"
7. Navigate to `/prospects` — verify the added prospect appears

- [ ] **Step 3: Test maquette generation**

1. Open the added prospect's detail page (`/prospects/[id]`)
2. Click "🎨 Générer la maquette"
3. Expected: button shows "Génération en cours (~30s)…" for ~20-60s
4. Expected: "Voir la démo" link appears with a netlify.app URL
5. Open the demo URL — verify a full HTML site loads

- [ ] **Step 4: Test email generation**

1. On the same prospect detail page, click "✉️ Générer l'email"
2. Expected: "Génération en cours…" for ~3-5s
3. Expected: Sujet + Corps appear with "Copier" buttons
4. Click "Copier" on the Corps — paste in a text editor to verify content

- [ ] **Step 5: Final build check**

```bash
cd crm && npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`, 0 errors, 0 warnings on TypeScript.

- [ ] **Step 6: Final commit**

```bash
cd crm && git add -A && git commit -m "feat: prospection cloud pipeline complete — search SSE + maquette Netlify + email Claude"
```
