#!/usr/bin/env node
/**
 * prospect.js — Agence Web Locale · Benjamin Bourger · Steenvoorde
 *
 * Usage :
 *   node prospect.js "plombier Steenvoorde"            → recherche + maquette HTML top prospect
 *   node prospect.js "coiffeur Cassel" --astro          → mode Astro (projet complet)
 *   node prospect.js "restaurant Bailleul" --tous       → maquettes pour TOUS les prospects HAUTE priorité
 *   node prospect.js "électricien Hazebrouck" --index   → rapport uniquement, pas de maquette
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import "dotenv/config";
import FirecrawlApp from "@mendable/firecrawl-js";

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function apiCall(params, attempt = 0) {
  try {
    return await client.messages.create(params);
  } catch (err) {
    const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('rate_limit');
    if (is429 && attempt < 3) {
      const retryAfter = err?.headers?.['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(60000 * Math.pow(2, attempt), 300000);
      console.log(`\n⏳  Rate limit — attente ${Math.round(delay / 1000)}s (tentative ${attempt + 1}/3)...\n`);
      await wait(delay);
      return apiCall(params, attempt + 1);
    }
    throw err;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ANTHROPIC_KEY     = process.env.ANTHROPIC_API_KEY;
const NETLIFY_TOKEN     = process.env.NETLIFY_TOKEN;
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;
const FIRECRAWL_KEY     = process.env.FIRECRAWL_KEY;

if (!ANTHROPIC_KEY || !NETLIFY_TOKEN || !GOOGLE_PLACES_KEY) {
  console.error("❌  Variables manquantes dans .env (ANTHROPIC_API_KEY, NETLIFY_TOKEN, GOOGLE_PLACES_KEY)");
  process.exit(1);
}
if (!FIRECRAWL_KEY) {
  console.warn("⚠️  FIRECRAWL_KEY absent — fallback fetch() activé (sites JS et anti-bot non garantis)");
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const RETRY_DELAY_MS = 60000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_SCRAPE_BYTES = 30000;
const INTER_PROSPECT_PAUSE_MS = 45000;
const MAX_CONTENT_SLICE = 3000;
const MAX_PLACES_RESULTS = 10;
const DEPLOY_POLL_INTERVAL_MS = 3000;
const DEPLOY_POLL_MAX_ATTEMPTS = 10;

const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
const firecrawl = FIRECRAWL_KEY ? new FirecrawlApp({ apiKey: FIRECRAWL_KEY }) : null;

// ─── Arguments CLI ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (!args.length || args[0] === "--help") {
  console.log(`
  Usage : node prospect.js "<requête>" [options]
  Options :
    --html     Génère une maquette HTML one-file (défaut)
    --astro    Génère un projet Astro complet
    --tous     Génère maquettes pour tous les prospects HAUTE priorité
    --index    Rapport uniquement, sans maquette
  Exemples :
    node prospect.js "plombier Steenvoorde"
    node prospect.js "coiffeur Cassel" --astro
    node prospect.js "artisans Bailleul" --tous
  `);
  process.exit(0);
}

const query = args.find((a) => !a.startsWith("--")) || "commerce Steenvoorde";
const mode  = args.includes("--astro") ? "astro" : "html";
const tous  = args.includes("--tous");
const index = args.includes("--index");

console.log(`\n🔍  Requête : "${query}"  |  Mode : ${mode.toUpperCase()}${tous ? " · TOUS" : ""}${index ? " · INDEX ONLY" : ""}\n`);

// ─── CRM léger ────────────────────────────────────────────────────────────────

const CRM_FILE = path.join(__dirname, "crm.json");

function chargerCRM() {
  if (!fs.existsSync(CRM_FILE)) return { prospects: [], mises_a_jour: [] };
  return JSON.parse(fs.readFileSync(CRM_FILE, "utf8"));
}

function ajouterAuCRM(prospects, query) {
  const crm = chargerCRM();
  const date = new Date().toISOString().split("T")[0];
  let added = 0;
  for (const p of prospects) {
    const exists = crm.prospects.find((c) => c.nom.toLowerCase().trim() === p.nom.toLowerCase().trim() && c.ville.toLowerCase().trim() === p.ville.toLowerCase().trim());
    if (!exists) {
      crm.prospects.push({
        ...p,
        statut_pipeline: "PROSPECT",
        date_ajout: date,
        date_contact: null,
        date_rdv: null,
        date_devis: null,
        date_signature: null,
        url_demo: null,
        url_proposition: null,
        notes: "",
      });
      added++;
    }
  }
  crm.mises_a_jour = crm.mises_a_jour || [];
  crm.mises_a_jour.push({ date, query, count: prospects.length, added });
  fs.writeFileSync(CRM_FILE, JSON.stringify(crm, null, 2), "utf8");
  console.log(`   📊  CRM : ${added} nouveaux ajoutés (${crm.prospects.length} total)`);
}

// ─── Palettes & directions design par activité ────────────────────────────────

function getDesignDirection(activite) {
  const a = activite.toLowerCase();

  if (a.match(/plombier|chauffage|sanitaire|chauffagiste/)) return {
    palette: { primary: "#1a3a5c", accent: "#e8a020", bg: "#f4f7fa", surface: "#e8eef5", text: "#0d1f33" },
    style: "industriel-premium", fontDisplay: "Barlow Condensed", fontBody: "Barlow",
    fonts: { display: "Barlow+Condensed:wght@600;700;800", body: "Barlow:wght@400;500;600" },
    heroTag: "Urgence 24h/24 · Devis gratuit · Garantie décennale",
    ambiance: "Marine profond + accents cuivrés. Texture métallique en hero. Chiffres d'impact très visibles. Typo condensée imposante.",
    stats: [{ val:"15", unit:"ans", label:"d'expérience" }, { val:"500+", unit:"", label:"chantiers" }, { val:"24h", unit:"/24", label:"disponible" }, { val:"4.9", unit:"/5", label:"satisfaction" }],
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
    stats: [{ val:"RGE", unit:"", label:"Certifié" }, { val:"10+", unit:"ans", label:"d'expérience" }, { val:"300+", unit:"", label:"clients" }, { val:"48h", unit:"", label:"délai devis" }],
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
    stats: [{ val:"8", unit:"ans", label:"d'expertise" }, { val:"2000+", unit:"", label:"clients" }, { val:"4.9", unit:"/5", label:"avis Google" }, { val:"100%", unit:"", label:"produits pro" }],
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
    stats: [{ val:"12", unit:"ans", label:"d'ouverture" }, { val:"50+", unit:"", label:"couverts" }, { val:"100%", unit:"", label:"fait maison" }, { val:"4.8", unit:"/5", label:"TripAdvisor" }],
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
    stats: [{ val:"20", unit:"ans", label:"de passion" }, { val:"30+", unit:"", label:"références pain" }, { val:"7j", unit:"/7", label:"ouvert" }, { val:"100%", unit:"", label:"artisanal" }],
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
    stats: [{ val:"20", unit:"ans", label:"de métier" }, { val:"100%", unit:"", label:"sur mesure" }, { val:"500+", unit:"", label:"réalisations" }, { val:"Local", unit:"", label:"Flandre intérieure" }],
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
    stats: [{ val:"12", unit:"ans", label:"d'expérience" }, { val:"400+", unit:"", label:"chantiers" }, { val:"100%", unit:"", label:"satisfait ou repris" }, { val:"4.9", unit:"/5", label:"avis clients" }],
    services: ["Peinture intérieure", "Peinture extérieure", "Ravalement de façade", "Décoration & enduits", "Isolation thermique", "Nettoyage haute pression"],
    heroTitle: (nom, ville) => `${nom} — Peintre artisan à ${ville}`,
    heroSub: "Intérieur · Extérieur · Ravalement · Devis gratuit sous 48h",
  };

  // Fallback générique mais soigné
  return {
    palette: { primary: "#162032", accent: "#2e7d5e", bg: "#f8faf9", surface: "#eaf2ee", text: "#162032" },
    style: "professionnel-moderne", fontDisplay: "DM Serif Display", fontBody: "DM Sans",
    fonts: { display: "DM+Serif+Display", body: "DM+Sans:wght@400;500;600" },
    heroTag: "Expertise locale · Qualité garantie · Devis gratuit",
    ambiance: "Bleu marine et vert forêt. Design aéré. Focus confiance et proximité locale.",
    stats: [{ val:"10+", unit:"ans", label:"d'expérience" }, { val:"200+", unit:"", label:"clients satisfaits" }, { val:"Local", unit:"", label:"Nord-Pas-de-Calais" }, { val:"4.8", unit:"/5", label:"satisfaction" }],
    services: ["Service principal 1", "Service principal 2", "Service principal 3", "Service principal 4", "Conseil & devis", "Intervention rapide"],
    heroTitle: (nom, ville) => `${nom} — Expert à ${ville}`,
    heroSub: "Qualité · Réactivité · Proximité · Devis gratuit",
  };
}

// ─── Google Places helpers ────────────────────────────────────────────────────

async function placesTextSearch(query) {
  // Si la requête est un seul mot (probablement un nom de ville), ajouter "commerces" pour cibler des entreprises
  const words = query.trim().split(/\s+/);
  let effectiveQuery = query;
  if (words.length === 1) {
    effectiveQuery = `commerces ${query}`;
    console.log(`   ℹ️  Requête enrichie : "${query}" → "${effectiveQuery}"`);
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(effectiveQuery)}&language=fr&region=fr&key=${GOOGLE_PLACES_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "ZERO_RESULTS") return [];
    if (data.status !== "OK") {
      console.error(`❌  Google Places erreur : ${data.status}`);
      if (data.status === "REQUEST_DENIED") {
        console.error("   → Vérifiez GOOGLE_PLACES_KEY dans .env et que l'API Places est activée");
      }
      return [];
    }
    // Filtrer les résultats qui sont des villes/régions, pas des entreprises
    const nonGeoTypes = new Set(["locality", "political", "administrative_area_level_1", "administrative_area_level_2", "country"]);
    const filtered = (data.results || []).filter(r => !r.types?.every(t => nonGeoTypes.has(t)));
    if (filtered.length < (data.results || []).length) {
      console.log(`   🔎  ${data.results.length - filtered.length} résultat(s) géographique(s) filtré(s)`);
    }
    return filtered;
  } catch (err) {
    console.error("❌  Places Text Search échoué :", err.message);
    return [];
  }
}

async function placesDetails(placeId) {
  const fields = "name,formatted_phone_number,website,opening_hours,rating";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=fr&key=${GOOGLE_PLACES_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK") return null;
    return data.result || null;
  } catch (err) {
    console.warn("   ⚠️  Places Details échoué :", err?.message?.slice(0, 80));
    return null;
  }
}

async function scrapeUrl(url) {
  // Primaire : Firecrawl (gère JS, Cloudflare, redirects → retourne markdown propre)
  if (firecrawl) {
    try {
      const result = await firecrawl.scrapeUrl(url, { formats: ["markdown"] });
      if (result.success && result.markdown) {
        return { content: result.markdown, source: "firecrawl" };
      }
    } catch (err) { console.warn("   ⚠️  Firecrawl fallback :", err?.message?.slice(0, 80)); }
  }

  // Fallback : fetch() natif (HTML brut tronqué à 30kb)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    clearTimeout(timeout);
    if (!res.ok) return { content: null, source: null };
    const html = await res.text();
    const truncated = html.length > MAX_SCRAPE_BYTES
      ? html.slice(0, MAX_SCRAPE_BYTES).replace(/<[^>]*$/, "")
      : html;
    return { content: truncated, source: "fetch" };
  } catch (err) {
    console.warn("   ⚠️  Fetch fallback échoué :", err?.message?.slice(0, 80));
    return { content: null, source: null };
  }
}

// ─── Parsing JSON Claude (utilitaire dédupliqué) ─────────────────────────────

function parseClaudeJSON(text, fallbackValue = null, label = "Claude") {
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    console.warn(`   ⚠️  ${label} : JSON invalide`);
    return fallbackValue;
  }
}

// ─── Analyse du site existant d'un prospect ──────────────────────────────────

async function analyserSiteExistant(url) {
  if (!url) return null;
  console.log(`   🔬  Analyse site existant : ${url}`);

  const scraped = await scrapeUrl(url);
  const contenu = scraped?.content || null;

  const response = await apiCall({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `Expert en audit de sites web pour artisans et TPE locaux français. Tu analyses avec un regard critique et commercial — tu identifies précisément ce qui coûte des clients au propriétaire.
Réponds UNIQUEMENT en JSON valide, sans markdown ni backtick.`,
    messages: [{
      role: "user",
      content: `Analyse ce site web d'un artisan/commerçant local : ${url}

${contenu
  ? `CONTENU DU SITE :\n${contenu.slice(0, 8000)}`
  : "⚠️ Contenu inaccessible — base ton analyse sur l'URL et les patterns connus pour ce type de commerce."}

Identifie précisément :
1. Sections manquantes (galerie photos réalisations, témoignages clients, stats/chiffres-clés, CTA fort, formulaire contact, FAQ...)
2. Signaux de conversion absents (numéro de tél caché ou absent du hero, pas de CTA above the fold, horaires introuvables, pas de bouton devis rapide, pas de badge garantie/certification...)
3. Qualité du contenu (textes trop génériques sans personnalité, absence de vraies photos du travail, pas de prix indicatifs, descriptions vides...)
4. Stack technique détectée (WordPress vieillissant, HTTP non sécurisé, non mobile-friendly, pas de meta description, design pré-2015...)
5. Points précis que la maquette de remplacement doit corriger et surpasser

Réponds UNIQUEMENT en JSON valide :
{
  "url_analysee": "${url}",
  "note_globale": 3,
  "sections_manquantes": ["Galerie photos réalisations", "Témoignages clients"],
  "signaux_conversion_absents": ["Téléphone absent du hero", "Aucun CTA above the fold"],
  "qualite_contenu": ["Textes trop génériques", "Pas de photos du travail réel"],
  "stack_technique": ["HTTP non sécurisé", "Non mobile-friendly", "WordPress 4.x daté"],
  "points_a_surpasser": ["Galerie photos avec vraies réalisations", "CTA téléphone dès le hero"],
  "resume_analyse": "Site daté de 2014, non mobile, sans accroche commerciale ni galerie.",
  "argument_commercial": "Votre site actuel perd des clients chaque jour : non mobile, non sécurisé, et invisible sur Google."
}`,
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  return parseClaudeJSON(text, null, "Analyse site");
}

// ─── Analyse concurrentielle ──────────────────────────────────────────────────

async function analyserConcurrents(query, prospects) {
  const secteur = prospects[0]?.activite || query.split(" ")[0];
  const villes = ["Hazebrouck", "Cassel", "Bailleul", "Wormhout", "Bergues"];
  console.log("📡  Étape 1b — Analyse concurrentielle...");

  // Trouver des concurrents avec site via Google Places
  const nomsProspe = new Set(prospects.map((p) => p.nom.toLowerCase().trim()));
  const concurrentsRaw = [];

  // Rechercher en parallèle dans les 5 villes
  const allPlacesResults = await Promise.all(
    villes.map(ville => placesTextSearch(`${secteur} ${ville}`))
  );

  // Collecter les 3 premiers concurrents avec un site (cap sur les appels Details)
  let detailCalls = 0;
  const MAX_DETAIL_CALLS = 15;
  for (let vi = 0; vi < allPlacesResults.length && concurrentsRaw.length < 3; vi++) {
    for (const place of allPlacesResults[vi]) {
      if (concurrentsRaw.length >= 3) break;
      if (detailCalls >= MAX_DETAIL_CALLS) break;
      if (nomsProspe.has(place.name.toLowerCase().trim())) continue;
      detailCalls++;
      const details = await placesDetails(place.place_id);
      if (!details?.website) continue;
      concurrentsRaw.push({
        nom: place.name,
        url: details.website,
        rating: place.rating || details.rating || null,
      });
    }
  }

  if (!concurrentsRaw.length) {
    console.log("   ℹ️  Aucun concurrent avec site trouvé dans la région");
    return { concurrents: [], benchmark_resume: "Aucun concurrent local avec site web identifié — avantage concurrentiel immédiat." };
  }

  // Scraper leurs sites
  const concurrentsAvecContenu = await Promise.all(
    concurrentsRaw.map(async (c) => {
      const scraped = await scrapeUrl(c.url);
      return { ...c, content: scraped?.content || null };
    })
  );

  // Analyse Claude (1 appel, sans tool)
  const response = await apiCall({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `Analyste commercial spécialisé dans la vente web aux TPE/artisans locaux français. Tu identifies les opportunités concurrentielles avec précision.
Réponds UNIQUEMENT en JSON valide, sans markdown ni backtick.`,
    messages: [{
      role: "user",
      content: `Analyse ces concurrents directs (${secteur}) dans la région Steenvoorde/Hazebrouck.

${concurrentsAvecContenu.map((c) => `
### ${c.nom} — ${c.url} (note Google : ${c.rating ?? "?"}/5)
${c.content ? c.content.slice(0, MAX_CONTENT_SLICE) : "Contenu inaccessible — analyse basée sur l'URL."}
`).join("\n")}

Pour chaque concurrent : ce qu'ils font bien visuellement et commercialement, ce qu'ils font mal, l'argument différenciant.

Réponds UNIQUEMENT en JSON valide :
{
  "concurrents": [
    {
      "nom": "Dupont Plomberie Hazebrouck",
      "url": "https://exemple.fr",
      "points_forts": ["Design propre", "Formulaire de contact", "Galerie photos"],
      "points_faibles": ["Pas de témoignages", "Non HTTPS", "Mobile approximatif"],
      "argument_comparatif": "Dupont a un site correct mais sans témoignages ni prise de RDV en ligne : vous aurez les deux."
    }
  ],
  "benchmark_resume": "Dans ce secteur local, les meilleurs sites ont une galerie propre mais manquent tous de témoignages vérifiés et de conversion mobile."
}`,
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  return parseClaudeJSON(text, { concurrents: [], benchmark_resume: "" }, "Analyse concurrents");
}

// ─── Recherche & analyse prospects ───────────────────────────────────────────

async function rechercherProspects(query) {
  console.log("📡  Étape 1 — Recherche de prospects via Google Places...");

  // 1. Récupérer les entreprises
  const places = await placesTextSearch(query);
  if (!places.length) {
    console.error("❌  Aucun résultat Google Places. Vérifiez la requête ou la clé API.");
    process.exit(1);
  }

  console.log(`   📍  ${places.length} résultats trouvés — enrichissement en cours...`);

  // 2. Enrichir par batch de 3 pour éviter le rate limiting
  const enrichis = [];
  const placesToProcess = places.slice(0, MAX_PLACES_RESULTS);
  for (let i = 0; i < placesToProcess.length; i += 3) {
    const batch = placesToProcess.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (place) => {
        const details = await placesDetails(place.place_id);
        const website = details?.website || null;
        let siteContent = null;
        if (website) {
          process.stdout.write(`   🔗  Scrape : ${website.slice(0, 60)}...
`);
          const scraped = await scrapeUrl(website);
          siteContent = scraped?.content ? scraped.content.slice(0, MAX_CONTENT_SLICE) : null;
        }
        return {
          nom: place.name,
          adresse: place.formatted_address,
          rating: place.rating || null,
          types: place.types || [],
          telephone: details?.formatted_phone_number || null,
          website,
          siteContent,
        };
      })
    );
    enrichis.push(...results);
  }

  // 3. Claude classifie (1 appel, sans tool)
  const date = new Date().toISOString().split("T")[0];
  const response = await apiCall({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `Expert commercial en vente de sites web aux TPE/artisans locaux France, secteur Steenvoorde (Nord).
Statuts : SANS_SITE (aucune URL propre), SITE_OBSOLETE (HTTP / design pré-2018 / non-mobile détectable dans le contenu), SITE_BASIQUE (site présent mais incomplet), SITE_CORRECT (ne pas inclure — pas de valeur commerciale).
Réponds UNIQUEMENT en JSON valide, sans markdown.`,
    messages: [{
      role: "user",
      content: `Voici les entreprises trouvées via Google Places pour la requête "${query}" dans la région Steenvoorde/Nord.
Pour chaque entreprise, détermine son statut web, sa priorité commerciale et génère un argument d'accroche personnalisé.

DONNÉES BRUTES :
${JSON.stringify(enrichis, null, 2)}

Réponds UNIQUEMENT en JSON valide :
{
  "query": "${query}",
  "date": "${date}",
  "resume": "analyse du marché local en 2-3 phrases",
  "prospects": [{
    "nom": "...",
    "activite": "type d'activité précis",
    "ville": "...",
    "telephone": "0X XX XX XX XX ou null",
    "email": "... ou null",
    "site_url": "URL ou null",
    "statut": "SANS_SITE|SITE_OBSOLETE|SITE_BASIQUE|SITE_CORRECT",
    "priorite": "HAUTE|MOYENNE|FAIBLE",
    "raison": "explication courte du statut",
    "argument_commercial": "phrase d'accroche personnalisée pour ce prospect"
  }],
  "top3": ["Nom1", "Nom2", "Nom3"]
}`,
    }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  let result = parseClaudeJSON(text, null, "Classification prospects");
  if (!result) console.error("   ❌  Impossible de parser la réponse Claude");

  if (result?.prospects?.length) {
    result.concurrents = await analyserConcurrents(query, result.prospects);
  }
  return result;
}

// ─── Génération maquette HTML "wow" ──────────────────────────────────────────

async function genererMaquetteHTML(prospect, analyse = null, concurrents = null) {
  const d = getDesignDirection(prospect.activite);
  const gfUrl = `https://fonts.googleapis.com/css2?family=${d.fonts.display}&family=${d.fonts.body}&display=swap`;

  const system = `Tu es un designer-développeur senior avec 15 ans d'expérience en création de sites web premium pour TPE et artisans locaux. Tu crées des sites qui provoquent un effet "wow" immédiat — modernes, animés, avec une identité visuelle forte adaptée au métier du client.

RÈGLES TECHNIQUES ABSOLUES :
- HTML inline one-file en mode démo, architecture Astro en mode prod (voir section OUTPUT)
- Mobile-first, responsive parfait 375px / 768px / 1280px
- Toutes les tailles de texte en clamp() pour fluidité
- Intersection Observer pour tous les effets au scroll
- Performances : images lazy-loaded, CSS transitions GPU-accelerated (transform, opacity uniquement)
- Zéro placeholder "Lorem ipsum", zéro image générique
- Tout le contenu est réel et spécifique au prospect

IDENTITÉ VISUELLE :
- Si le prospect a un site existant, analyser objectivement son niveau de modernité :

  SITE RÉCENT / CORRECT (< 3 ans, design plat, typographie propre) :
  → Extraire fidèlement palette, typographie, logo et univers visuel
  → Moderniser uniquement les détails : animations, micro-interactions, espacements
  → Le client doit reconnaître SA marque quasi immédiatement

  SITE DATÉ / OBSOLÈTE (> 3 ans OU : dégradés brillants, ombres lourdes, boutons
  biseautés, Comic Sans ou Times New Roman, fond texturé kitsch, mise en page
  tableau, favicon IE, couleurs criardes non cohérentes) :
  → NE PAS reproduire l'esthétique — elle nuirait à l'effet wow
  → Extraire uniquement : couleur dominante principale, secteur d'activité, ton
    (sérieux / chaleureux / technique / artisanal)
  → Construire une identité moderne à partir de ces 3 éléments + direction
    artistique par métier
  → Garder 1 seule couleur reconnaissable du site actuel pour créer un pont
    psychologique avec l'existant — le client sent que c'est "lui" mais en mieux
  → Commenter dans le code : "// Identité modernisée — palette originale jugée obsolète"

  SANS SITE (SANS_SITE) :
  → Appliquer intégralement la direction artistique par métier
  → Inventer une identité premium cohérente avec le secteur et la région

CRITÈRES D'OBSOLESCENCE (si 3+ critères présents → site jugé daté) :
- Dégradés glossy ou ombres portées épaisses sur les boutons
- Typographie serif classique (Times, Georgia) ou Comic Sans comme police principale
- Fond avec texture (bois, béton, tissu) en image répétée
- Mise en page en tableaux HTML ou colonnes rigides sans responsive
- Couleurs saturées non cohérentes (rouge vif + jaune + vert ensemble)
- Copyright footer < 2020
- Pas de HTTPS
- Favicon basse résolution ou icône IE
- Animations Flash ou gif animés
- Menu hamburger absent sur mobile

GESTION DES IMAGES :
Toutes les sections nécessitant une image doivent avoir un visuel cohérent et professionnel —
jamais de bloc vide, jamais de placeholder gris, jamais de texte "image ici".

STRATÉGIE PAR TYPE D'IMAGE :

Photos de réalisations / portfolio :
→ Générer un SVG illustratif réaliste représentant le métier du client
→ Exemples : chantier de plomberie stylisé, coupe de cheveux en silhouette élégante,
  devanture de boulangerie, cuisine de restaurant, façade de maison repeinte
→ SVG inline directement dans le HTML, couleurs cohérentes avec la palette du site
→ Style : illustration moderne, flat design avec ombres douces, pas de clipart

Photo de l'artisan / équipe :
→ Générer un SVG avatar professionnel stylisé (silhouette avec tenue de métier :
  bleu de travail, tablier, veste de cuisine, tenue de coiffeur...)
→ Fond avec dégradé de la palette du client
→ Jamais un visage réaliste — toujours une silhouette ou illustration stylisée

Images de fond / hero background :
→ Utiliser l'Aurora gradient animé comme fond principal (voir section effets)
→ Si une image de fond est nécessaire : générer un SVG abstrait cohérent avec le métier
  (formes géométriques évoquant l'activité : tuyaux stylisés pour plombier,
  ciseaux pour coiffeur, pain pour boulanger, pinceau pour peintre...)

Icônes de services :
→ SVG inline dessinés à la main (pas de Font Awesome, pas d'emoji)
→ Cohérents avec la palette, stroke style ou filled selon l'ambiance du site
→ Taille minimum 48x48px, optimisés pour la lisibilité mobile

Images de la section "À propos" :
→ SVG illustratif montrant l'artisan au travail dans son environnement
→ Style épuré, moderne, avec les couleurs dominantes de la palette
→ Inclure un détail métier reconnaissable (outil, équipement, produit...)

RÈGLE ABSOLUE IMAGES :
Chaque image SVG générée doit être :
- Unique et spécifique au métier et à la ville du prospect
- Cohérente avec la palette de couleurs du site
- Suffisamment détaillée pour ne pas paraître vide
- Commentée dans le code : <!-- SVG généré — à remplacer par photo réelle en prod -->

EFFETS VISUELS OBLIGATOIRES — EFFET WOW :

Hero section :
- Fond Aurora/Mesh gradient animé : dégradé de 3 couleurs de la palette du client qui morphe lentement en continu (animation CSS @keyframes sur background-position ou hue-rotate)
- Titre principal : effet Scramble text au chargement (caractères aléatoires qui se résolvent en vrai texte, JS pur)
- Sous-titre : effet Typewriter avec curseur clignotant
- Noise texture subtile en overlay (SVG filter feTurbulence) pour casser le flat
- CTA bouton principal : effet Magnetic (JS, le bouton attire légèrement le curseur dans un rayon de 80px) + Glow pulsant en continu

Scroll animations (Intersection Observer, threshold 0.15) :
- Fade up par défaut sur tous les éléments (translateY 40px → 0, opacity 0 → 1, duration 0.7s ease-out)
- Stagger sur les groupes de cards : délai 0.1s entre chaque enfant
- Reveal sur les titres de section : bloc coloré qui glisse de gauche à droite révélant le texte dessous
- Parallax léger sur les images de fond (translateY proportionnel au scroll, JS requestAnimationFrame)
- Counter animé sur les chiffres clés : incrémentation depuis 0 jusqu'à la valeur réelle quand le bloc entre dans le viewport

Éléments interactifs :
- Tilt 3D sur toutes les cards (JS, rotation max 8deg selon position curseur, perspective 1000px)
- Underline slide sur tous les liens de navigation (pseudo-élément ::after qui scale de 0 → 1)
- Glow hover sur les cards : box-shadow colorée qui apparaît au survol
- Gradient text animé sur les éléments d'accroche clés (background-clip: text, animation sur background-position)

Fond et ambiance :
- Glassmorphism sur les cards secondaires : backdrop-filter blur(12px), fond rgba semi-transparent, border 1px solid rgba(255,255,255,0.15)
- Floating particles en arrière-plan du hero : 15-20 petits cercles SVG qui flottent avec des animations CSS indépendantes à des vitesses différentes

MICRO-INTERACTIONS SUPPLÉMENTAIRES :
- Curseur personnalisé : cercle vide qui suit la souris, grossit sur les éléments cliquables
- Smooth scroll natif (scroll-behavior: smooth)
- Loading animation : fade in global de la page sur DOMContentLoaded (opacity 0 → 1, 0.4s)
- Bouton "retour en haut" qui apparaît après 300px de scroll avec animation slide-in

STRUCTURE OBLIGATOIRE DES SECTIONS :
1. Navigation sticky : backdrop-filter blur au scroll, logo + liens + CTA, underline slide sur les liens
2. Hero : Aurora gradient + Scramble title + Typewriter subtitle + Magnetic CTA + Floating particles
3. Signaux de confiance : logos/badges (RGE, assurances, années d'expérience) — Stagger fade up
4. Services : 3-4 cards Tilt 3D + Glow hover, icônes SVG inline cohérentes avec le métier
5. Chiffres clés : Counter animé, 3-4 stats percutantes et réelles (années d'expérience, zone d'intervention, délai moyen...)
6. À propos / Réalisations : SVG illustratif métier + Parallax, Reveal sur le texte
7. Témoignages : cards Glassmorphism, si disponibles
8. Zone de service : carte ou liste des villes couvertes
9. Contact / CTA final : formulaire simple, téléphone cliquable, Aurora gradient en fond inversé
10. Footer : mentions légales, liens, SIRET si disponible

QUALITÉ DU CONTENU :
- Titres accrocheurs spécifiques au métier et à la ville (jamais génériques)
- Arguments adaptés aux objections locales (Wix, "mon neveu peut le faire", "j'ai Facebook")
- CTA orientés action immédiate : "Appelez maintenant", "Devis gratuit en 24h", "Voir mes réalisations"
- Aucun jargon technique dans le contenu — langage simple et direct pour artisans

INTERDICTIONS ABSOLUES :
- Jamais de fond uni sans texture ou animation
- Jamais de layout 3 colonnes égales (le layout générique IA)
- Jamais de border-radius identique sur tous les éléments
- Jamais d'emoji dans le contenu
- Jamais de texte AI cliché : "Elevate", "Seamless", "Unleash", "Next-Gen", "Sur-mesure" comme seul argument
- Jamais de hauteur 100vh fixe — utiliser min-height: 100dvh
- Jamais d'images placeholder ou de unsplash/picsum — utiliser des SVG inline ou des dégradés cohérents
- Jamais de bloc image vide — toujours un SVG illustratif cohérent

OUTPUT — DEUX MODES SELON LE CONTEXTE :

MODE DÉMO (génération maquette prospect) :
- Un seul fichier HTML complet, self-contained
- Tous les CSS et JS inline dans le fichier
- Déployable immédiatement sur Netlify Drop en URL temporaire
- Objectif : provoquer un "wow" immédiat, pas la maintenabilité
- Commenter en début de fichier : <!-- DÉMO — Ne pas utiliser en production -->
- Si le site existant a été jugé obsolète, ajouter :
  <!-- IDENTITÉ : modernisée — palette originale jugée obsolète. Couleur conservée : #XXXXXX -->
- Tous les SVG illustratifs générés sont commentés :
  <!-- SVG généré — à remplacer par photo réelle en prod -->

MODE PRODUCTION (prospect signé, mise en ligne réelle) :
Basculer vers une architecture Astro + Tailwind CSS propre et maintenable :

Structure :
src/
├── components/
│   ├── Nav.astro
│   ├── Hero.astro
│   ├── Services.astro
│   ├── Chiffres.astro
│   ├── APropos.astro
│   ├── Temoignages.astro
│   ├── Contact.astro
│   └── Footer.astro
├── layouts/
│   └── Layout.astro        ← head, meta, fonts, schema.org
├── pages/
│   └── index.astro         ← assemblage des composants
├── styles/
│   ├── global.css          ← variables CSS, reset, typographie
│   └── animations.css      ← tous les keyframes et effets scroll
├── scripts/
│   ├── animations.js       ← Intersection Observer, Parallax, Counter
│   ├── scramble.js         ← effet Scramble text
│   ├── tilt.js             ← effet Tilt 3D sur les cards
│   └── magnetic.js         ← effet Magnetic sur les CTAs
└── assets/
    └── images/             ← photos réelles fournies par le client
        ← remplacer ici les SVG de démo par les vraies photos

Règles architecture prod :
- Zéro style inline — tout dans les fichiers CSS/Tailwind
- Zéro script inline — tout dans /scripts/ importé en module
- Variables CSS dans :root pour toute la palette client (facile à modifier)
- Composants réutilisables et indépendants
- Commentaires clairs dans chaque fichier pour modifications futures
- README.md à la racine avec : structure du projet, comment modifier les textes,
  comment changer les couleurs, comment ajouter une page, comment déployer
- package.json avec scripts : dev, build, preview, deploy

Déploiement prod :
- Connecté au repo GitHub du client (repo privé créé par Flandre Web)
- Netlify CI/CD : chaque push sur main → déploiement automatique
- Domaine .fr connecté dans Netlify → HTTPS automatique
- Formulaire de contact via Netlify Forms (zéro backend)
- Google Search Console connectée dès la mise en ligne`;

  const analyseSection = analyse ? `
SITE ACTUEL À CORRIGER (note ${analyse.note_globale}/10 — corriger CHAQUE point listé) :
→ Sections manquantes à INTÉGRER absolument : ${(analyse.sections_manquantes || []).join(", ")}
→ Signaux de conversion à AJOUTER : ${(analyse.signaux_conversion_absents || []).join(", ")}
→ Problèmes contenu à RÉSOUDRE : ${(analyse.qualite_contenu || []).join(", ")}
→ Stack obsolète à DÉPASSER visuellement : ${(analyse.stack_technique || []).join(", ")}
Ce site doit être l'OPPOSÉ EXACT de chaque faiblesse listée ci-dessus.
` : "";

  const concurrentsSection = concurrents?.concurrents?.length ? `
SURPASSER LES CONCURRENTS :
${concurrents.concurrents.map(c =>
  `• ${c.nom} : bien=${(c.points_forts || []).join(", ")} / à dépasser=${(c.points_faibles || []).join(", ")}`
).join("\n")}
Benchmark : ${concurrents.benchmark_resume || ""}
Ce site doit surpasser tous ces concurrents sur chaque point faible identifié.
` : "";

  const user = `Crée le fichier HTML complet pour :

CLIENT : ${prospect.nom} · ${prospect.activite} · ${prospect.ville}
TÉL : ${prospect.telephone || "03 XX XX XX XX"}
EMAIL : ${prospect.email || "contact@" + prospect.nom.toLowerCase().replace(/[^a-z]/g, "") + ".fr"}

DIRECTION ARTISTIQUE : ${d.style}
${d.ambiance}
Font display : "${d.fontDisplay}" — body : "${d.fontBody}"
Google Fonts : ${gfUrl}

CSS :root :
  --primary:${d.palette.primary}; --accent:${d.palette.accent};
  --bg:${d.palette.bg}; --surface:${d.palette.surface}; --text:${d.palette.text};
  --white:#fff; --radius:8px; --shadow:0 4px 24px rgba(0,0,0,0.10);
  --transition:0.3s cubic-bezier(0.4,0,0.2,1);
${analyseSection}${concurrentsSection}
HERO (100vh) :
  Titre H1 : "${d.heroTitle(prospect.nom, prospect.ville)}" — clamp(2.5rem,6vw,5rem), font display
  Sous-titre : "${d.heroSub}"
  Badge : "${d.heroTag}" — pill animé, border --accent
  2 CTAs : [Demander un devis] plein --accent + [Nous appeler] outline blanc, min-height 48px
  Fond : gradient en couches OU formes géométriques CSS (clip-path, pattern CSS, SVG décoratifs) — JAMAIS fond plat
  Numéro de téléphone visible et cliquable (href="tel:") above the fold
  Animations stagger : badge 0.2s, titre 0.4s, sous-titre 0.6s, CTAs 0.8s

STATS (fond --primary, texte blanc, 4 col desktop / 2 tablette / 1 mobile) :
${d.stats.map(s => `  "${s.val}${s.unit}" + "${s.label}"`).join("\n")}
  Compteurs animés au scroll (Intersection Observer + rAF + easeOutQuart)

SERVICES (grille 3 col desktop / 2 tablette / 1 col mobile strict) :
${d.services.map(s => `  • ${s}`).join("\n")}
  Chaque card : icône SVG inline complexe + titre + description 2 lignes · hover translateY(-4px) + shadow + border-top --accent
  Micro-interaction sur chaque card CTA : shimmer ou ripple

GALERIE : grille CSS asymétrique (1 col <480px, 2 col <768px, 3 col desktop avec hauteurs variées), placeholders visuels CSS pur (gradient --primary→--accent + icône SVG)

À PROPOS : layout 2 colonnes asymétriques, visuel CSS à gauche + texte à droite, ancrage local Flandre, checklist SVG, fond --surface

TÉMOIGNAGES (fond --primary, texte blanc) : 3 avis fictifs réalistes, prénoms nordistes, étoiles SVG pleines, guillemets «», prénom + ville + activité

CONTACT : 2 colonnes — formulaire (labels flottants CSS, validation JS temps réel, min-height 48px, font-size 16px, loading state, état succès) + coordonnées + horaires

NAVIGATION : sticky, blur backdrop-filter au scroll, hamburger mobile (animation 3 barres → X, menu slide-down, overlay semi-transparent, fermeture clic extérieur), logo font display couleur --accent

FOOTER : 4 col desktop / 1 col mobile (flex-direction:column, centré), copyright, "Site réalisé par Benjamin Bourger — Steenvoorde"

JS OBLIGATOIRE (sans ce script le site est CASSÉ — les éléments restent invisibles à opacity:0) :
- <script> en fin de <body> — JAMAIS l'omettre
- Au DOMContentLoaded : ajouter immédiatement .animate sur TOUS les éléments du hero (badge, titre, sous-titre, phone, CTAs) pour qu'ils passent de opacity:0 à opacity:1
- Intersection Observer fade-up sur toutes les sections restantes
- Compteurs animés (rAF + easeOutQuart)
- Nav scroll + hamburger complet avec overlay + fermeture clic extérieur
- Formulaire async avec validation + loading state
- Ripple effect sur CTAs principaux

Commence par <!DOCTYPE html>. AUCUNE explication. AUCUN markdown. AUCUN backtick.`;

  const response = await apiCall({
    model: "claude-sonnet-4-20250514", max_tokens: 16000,
    system, messages: [{ role: "user", content: user }],
  });
  let html = (response.content.find((b) => b.type === "text")?.text || "").trim();

  // Sécurité : si Claude a omis le <script>, injecter un fallback qui rend les éléments visibles
  // Détection case-insensitive pour couvrir <Script>, <SCRIPT>, etc.
  if (!/<script/i.test(html)) {
    console.warn("   ⚠️   JS manquant dans la maquette — injection du fallback animations");
    const fallbackScript = `<script>
document.addEventListener('DOMContentLoaded', function() {
  ['heroBadge','heroTitle','heroSubtitle','heroPhone','heroCtas'].forEach(function(id) {
    let el = document.getElementById(id);
    if (el) el.classList.add('animate');
  });
  let observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) { e.target.style.opacity='1'; e.target.style.transform='translateY(0)'; } });
  }, { threshold: 0.1 });
  document.querySelectorAll('section:not(.hero)').forEach(function(s) { observer.observe(s); });
  let nav = document.getElementById('navbar');
  if (nav) window.addEventListener('scroll', function() { nav.classList.toggle('scrolled', window.scrollY > 50); });
  let toggle = document.querySelector('.hamburger');
  let menu = document.querySelector('.nav-links');
  let overlay = document.querySelector('.nav-overlay');
  if (toggle && menu) {
    toggle.addEventListener('click', function() { toggle.classList.toggle('active'); menu.classList.toggle('open'); if(overlay) overlay.classList.toggle('active'); });
    if(overlay) overlay.addEventListener('click', function() { toggle.classList.remove('active'); menu.classList.remove('open'); overlay.classList.remove('active'); });
  }
});
</script>`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", fallbackScript + "\n</body>");
    } else {
      html += "\n" + fallbackScript;
    }
  }

  // Validation minimale du HTML généré
  if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<html")) {
    console.warn("   ⚠️   HTML invalide reçu de Claude — début:", html.slice(0, 100));
    // Tenter de trouver le HTML dans la réponse (Claude ajoute parfois du texte avant)
    const htmlStart = html.indexOf("<!DOCTYPE");
    if (htmlStart > 0) {
      html = html.slice(htmlStart);
    }
  }

  return html;
}

// ─── Génération maquette Astro (fichiers séparés, robuste) ───────────────────

async function genererMaquetteAstro(prospect, outputDir) {
  const d = getDesignDirection(prospect.activite);
  const gfUrl = `https://fonts.googleapis.com/css2?family=${d.fonts.display}&family=${d.fonts.body}&display=swap`;

  const baseSystem = `Tu es un développeur Astro expert, 15 ans d'expérience.
Tu génères du code propre et production-ready.
Réponds UNIQUEMENT avec le code — pas d'explication, pas de markdown, pas de backticks.
Le code commence directement par le premier caractère valide.`;

  const cssVars = `--primary:${d.palette.primary};--accent:${d.palette.accent};--bg:${d.palette.bg};--surface:${d.palette.surface};--text:${d.palette.text};--white:#fff;--radius:8px;--shadow:0 4px 24px rgba(0,0,0,.1);--transition:.3s cubic-bezier(.4,0,.2,1)`;
  const clientInfo = `${prospect.nom} · ${prospect.activite} · ${prospect.ville} · tél: ${prospect.telephone || "03 XX XX XX XX"}`;

  const fichiers = [
    { path: "astro.config.mjs", prompt: `astro.config.mjs pour projet Astro static avec @astrojs/sitemap. Site : ${prospect.nom.toLowerCase().replace(/[^a-z0-9]/g,"-")}.fr` },
    { path: "package.json", prompt: `package.json Astro : astro + @astrojs/sitemap, nom "${prospect.nom.toLowerCase().replace(/[^a-z0-9]/g,"-")}", scripts dev/build/preview` },
    { path: "src/layouts/BaseLayout.astro", prompt: `BaseLayout.astro pour ${clientInfo}.
Props: title, description. Google Fonts: ${gfUrl}
CSS global :root { ${cssVars} } + reset + body font "${d.fontBody}" color var(--text) bg var(--bg).
Import Header et Footer. Slot contenu. Balises SEO: title, meta description, og:title, og:image.` },
    { path: "src/components/Header.astro", prompt: `Header.astro sticky pour ${clientInfo}.
Logo textuel font "${d.fontDisplay}" couleur var(--accent). Liens: Accueil / Services / Réalisations / Contact.
Nav transparente → blur + background sombre au scroll (script vanilla inline).
Hamburger mobile animé. Couleurs: primary=${d.palette.primary} accent=${d.palette.accent}` },
    { path: "src/components/Hero.astro", prompt: `Hero.astro 100vh pour ${clientInfo}.
Titre: "${d.heroTitle(prospect.nom, prospect.ville)}" — très grand clamp(2.5rem,6vw,5rem) font "${d.fontDisplay}"
Badge: "${d.heroTag}" pill border var(--accent)
Sous-titre: "${d.heroSub}"
2 CTAs: [Demander un devis] bg var(--accent) + [Nous appeler] outline blanc
Fond: gradient sophistiqué ou formes CSS — PAS de couleur unie.
Animations CSS staggered. Style scoped.` },
    { path: "src/components/Stats.astro", prompt: `Stats.astro pour ${clientInfo}.
Bande horizontale fond var(--primary) texte blanc, 4 colonnes:
${d.stats.map(s => `"${s.val}${s.unit}" + "${s.label}"`).join(", ")}
Compteurs animés Intersection Observer + rAF (script inline). Séparateurs entre colonnes.` },
    { path: "src/components/Services.astro", prompt: `Services.astro pour ${clientInfo}.
Grille 3 col desktop / 2 tablette / 1 mobile.
Services: ${d.services.join(", ")}
Chaque card: icône SVG inline pertinente + titre + description 2 lignes.
Hover: translateY(-4px) + shadow + border-top var(--accent). Fade-up au scroll.` },
    { path: "src/components/Footer.astro", prompt: `Footer.astro pour ${clientInfo}.
3 colonnes: logo+description / navigation / contact (tél+email+horaires fictifs).
Fond #0d0d14. Copyright + "Site réalisé par Benjamin Bourger — Développeur web · Steenvoorde".` },
    { path: "src/pages/index.astro", prompt: `Page index.astro pour ${clientInfo}.
Utilise: BaseLayout (title="${d.heroTitle(prospect.nom, prospect.ville)}", description="${d.heroSub}"), Header, Hero, Stats, Services, Footer.
Ajoute inline:
- Section Galerie: grille CSS asymétrique, placeholders visuels CSS pur (gradient + SVG)
- Section À propos: 2 colonnes, visuel CSS gauche, texte ancrage local Flandre, checklist SVG
- Section Témoignages: fond var(--primary), 2 avis fictifs réalistes, prénoms nordistes, étoiles SVG
Intersection Observer fade-up sur toutes les sections (script inline).` },
    { path: "src/pages/contact.astro", prompt: `Page contact.astro pour ${clientInfo}.
BaseLayout + Header + Footer.
Formulaire 2 colonnes: champs (Nom / Téléphone / Email / Type travaux select / Message / Submit) + coordonnées.
Labels flottants CSS. Validation JS temps réel. data-netlify="true" pour Netlify Forms.
Bouton: loading state CSS spinner → message succès JS.` },
    { path: "public/robots.txt", prompt: `robots.txt simple: Allow all + Sitemap: https://example.com/sitemap.xml` },
  ];

  for (const fichier of fichiers) {
    process.stdout.write(`   ✍️   ${fichier.path}...\n`);
    const response = await apiCall({
      model: "claude-sonnet-4-20250514", max_tokens: 4000,
      system: baseSystem,
      messages: [{ role: "user", content: fichier.prompt }],
    });
    const content = (response.content.find((b) => b.type === "text")?.text || "").trim();
    const fullPath = path.join(outputDir, fichier.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  console.log(`   ✅  ${fichiers.length} fichiers Astro générés`);
}

// ─── Page de présentation (enveloppe la démo) ─────────────────────────────────

function genererPagePresentation(prospect, demoUrl) {
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const slugClient = slugify(prospect.nom);
  // Échapper toutes les données prospect pour empêcher l'injection XSS
  const nom = escapeHtml(prospect.nom);
  const ville = escapeHtml(prospect.ville);
  const raison = escapeHtml(prospect.raison);
  const statut = escapeHtml(prospect.statut);
  // Valider que demoUrl est bien une URL Netlify HTTPS
  const safeDemoUrl = (demoUrl && /^https:\/\/[a-z0-9-]+\.netlify\.app\/?$/i.test(demoUrl)) ? demoUrl : null;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposition de site web — ${nom}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--blue:#1a3a5c;--accent:#e8a020;--green:#2e7d5e;--red:#dc2626;--bg:#f0f4f8;--white:#fff;--text:#1a2744;--muted:#6b7280;--r:12px;--s:0 4px 24px rgba(0,0,0,.08)}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}

.topbar{background:var(--white);border-bottom:1px solid #e5e7eb;padding:.9rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.topbar-logo{font-size:.95rem;font-weight:700;color:var(--blue)}.topbar-logo span{color:var(--accent)}
.topbar-badge{background:#fef3e2;color:#92400e;font-size:.72rem;font-weight:600;padding:.3rem .8rem;border-radius:99px;border:1px solid #fde68a}

.hero{background:linear-gradient(135deg,var(--blue) 0%,#0a1e35 100%);color:#fff;padding:3.5rem 2rem 3rem;text-align:center}
.hero-tag{display:inline-flex;align-items:center;gap:.5rem;background:rgba(232,160,32,.15);border:1px solid rgba(232,160,32,.4);color:#fbbf24;font-size:.72rem;font-weight:700;padding:.4rem 1rem;border-radius:99px;margin-bottom:1.5rem;letter-spacing:.08em;text-transform:uppercase}
.hero h1{font-size:clamp(1.4rem,3.5vw,2.2rem);font-weight:800;margin-bottom:.75rem;line-height:1.2}
.hero h1 em{color:var(--accent);font-style:normal}
.hero p{color:rgba(255,255,255,.7);font-size:.95rem;max-width:560px;margin:0 auto 1.5rem;line-height:1.6}
.hero-meta{font-size:.75rem;color:rgba(255,255,255,.35);letter-spacing:.03em}

.wrap{max-width:1320px;margin:0 auto;padding:2rem}

.preview-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.6rem;display:flex;align-items:center;gap:.5rem}
.live-dot{width:8px;height:8px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
.browser{background:#1e1e1e;border-radius:var(--r) var(--r) 0 0;padding:.7rem 1rem;display:flex;align-items:center;gap:.5rem}
.dots{display:flex;gap:5px}.dots span{width:11px;height:11px;border-radius:50%}
.dots span:nth-child(1){background:#ff5f57}.dots span:nth-child(2){background:#ffbd2e}.dots span:nth-child(3){background:#28ca41}
.url-bar{flex:1;background:#2d2d2d;border-radius:5px;padding:.28rem .75rem;font-size:.72rem;color:#9ca3af;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 .5rem}
.preview-frame{width:100%;height:78vh;min-height:580px;border:none;display:block;background:#fff;border-radius:0 0 var(--r) var(--r);box-shadow:var(--s)}
.no-preview{background:#fff;border-radius:0 0 var(--r) var(--r);height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);gap:.75rem;font-size:.88rem}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;margin-top:1.5rem}
.card{background:var(--white);border-radius:var(--r);padding:1.5rem;box-shadow:var(--s)}
.card-label{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:1rem}
.card-main{font-size:1.4rem;font-weight:800;color:var(--text);margin-bottom:.25rem}
.card-sub{font-size:.82rem;color:var(--muted);line-height:1.5}
.alert{margin-top:.9rem;padding:.75rem;background:#fef2f2;border-radius:8px;font-size:.79rem;color:#7f1d1d;line-height:1.5}
.check-list{list-style:none;display:flex;flex-direction:column;gap:.4rem}
.check-list li{display:flex;align-items:center;justify-content:space-between;padding:.45rem 0;border-bottom:1px solid #f3f4f6;font-size:.86rem}
.check-list li:last-child{border:none}
.check{color:var(--green);font-weight:700;font-size:1rem}
.price-big{font-size:2.2rem;font-weight:800;color:var(--blue)}
.price-big sup{font-size:1rem;vertical-align:super;font-weight:600}
.price-big small{font-size:.9rem;font-weight:400;color:var(--muted)}

.cta-bar{background:var(--white);border-top:1px solid #e5e7eb;padding:2rem;text-align:center;margin-top:2rem;border-radius:var(--r)}
.cta-bar h2{font-size:1.2rem;font-weight:800;margin-bottom:.4rem}
.cta-bar p{color:var(--muted);font-size:.88rem;margin-bottom:1.4rem}
.btn-group{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
.btn{padding:.8rem 1.6rem;border-radius:8px;font-weight:600;font-size:.9rem;cursor:pointer;border:2px solid transparent;text-decoration:none;display:inline-block;transition:all .2s}
.btn-green{background:var(--green);color:#fff}.btn-green:hover{background:#236347}
.btn-blue{background:var(--blue);color:#fff}.btn-blue:hover{background:#0d2438}
.btn-out{background:#fff;color:var(--blue);border-color:var(--blue)}.btn-out:hover{background:var(--bg)}

.sig{text-align:center;padding:1.25rem;font-size:.75rem;color:var(--muted)}
.sig a{color:inherit}
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-logo">Benjamin<span>.</span>Bourger <span style="font-weight:400;color:var(--muted);font-size:.85rem">— Développeur web · Steenvoorde</span></div>
  <div class="topbar-badge">📍 Proposition confidentielle · ${date}</div>
</div>

<section class="hero">
  <div class="hero-tag"><span>✦</span> Préparé spécialement pour ${nom}</div>
  <h1>Voici à quoi pourrait ressembler<br><em>${nom}</em> sur le web</h1>
  <p>J'ai créé cette maquette gratuitement pour vous montrer le potentiel d'une vraie présence en ligne. Professionnelle, moderne, et trouvable sur Google.</p>
  <div class="hero-meta">Préparée le ${date} · Benjamin Bourger · 06.63.78.57.62 · Steenvoorde (59114)</div>
</section>

<div class="wrap">

  <div class="preview-label"><span class="live-dot"></span>Aperçu de votre future vitrine</div>
  <div class="browser">
    <div class="dots"><span></span><span></span><span></span></div>
    <div class="url-bar">🔒 ${slugClient}-${slugify(prospect.ville)}.fr</div>
  </div>
  ${safeDemoUrl
    ? `<iframe class="preview-frame" src="${safeDemoUrl}" title="Aperçu ${nom}"></iframe>`
    : `<div class="no-preview">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <div>Ouvrez <strong>output/${slugClient}/index.html</strong> dans votre navigateur</div>
       </div>`}

  <div class="cards">
    <div class="card">
      <div class="card-label">Votre situation actuelle</div>
      <div class="card-main" style="color:${prospect.statut==='SANS_SITE'?'var(--red)':'#d97706'}">
        ${prospect.statut==='SANS_SITE' ? '❌ Aucun site web' : '⚠️ Site à moderniser'}
      </div>
      <div class="card-sub" style="margin-top:.5rem">${raison}</div>
      <div class="alert">💡 Vos concurrents avec un site moderne captent les clients qui vous cherchent sur Google — sans que vous le sachiez.</div>
    </div>

    <div class="card">
      <div class="card-label">Ce que comprend cette offre</div>
      <ul class="check-list">
        <li>Site vitrine responsive <span class="check">✓</span></li>
        <li>Mobile-first (smartphone) <span class="check">✓</span></li>
        <li>Formulaire de contact <span class="check">✓</span></li>
        <li>SEO local (Google) <span class="check">✓</span></li>
        <li>HTTPS + hébergement 1 an <span class="check">✓</span></li>
        <li>Nom de domaine .fr inclus <span class="check">✓</span></li>
        <li>Joignable localement <span class="check">✓</span></li>
      </ul>
    </div>

    <div class="card">
      <div class="card-label">Votre investissement</div>
      <div class="price-big"><sup>à partir de </sup>690<small> €</small></div>
      <div class="card-sub" style="margin-top:.4rem">Paiement en 2 fois · 50% au démarrage · 50% à la livraison</div>
      <div class="card-sub" style="margin-top:.9rem;padding-top:.9rem;border-top:1px solid #f3f4f6">
        Si un seul client vous appelle grâce au site, il est déjà rentabilisé.<br><br>
        <strong>Maintenance optionnelle : 49€/mois</strong><br>
        Mises à jour · Surveillance · Domaine & hébergement inclus
      </div>
    </div>
  </div>

  <div class="cta-bar">
    <h2>Cette maquette vous intéresse ?</h2>
    <p>Un appel de 10 minutes suffit pour démarrer. Je suis basé à Steenvoorde — on peut se voir si vous préférez.</p>
    <div class="btn-group">
      <a href="tel:0663785762" class="btn btn-green">📞 Appeler Benjamin — 06.63.78.57.62</a>
      <a href="mailto:benjamin.bourger92@gmail.com?subject=Site web ${encodeURIComponent(prospect.nom)}&body=Bonjour Benjamin, j'ai vu la maquette et je suis intéressé." class="btn btn-blue">✉️ Envoyer un email</a>
      <a href="https://wa.me/33663785762?text=Bonjour Benjamin, j'ai vu la maquette pour ${encodeURIComponent(prospect.nom)} et ça m'intéresse !" class="btn btn-out">💬 WhatsApp</a>
    </div>
  </div>

</div>

<div class="sig">
  Proposition préparée par <strong>Benjamin Bourger</strong> — Développeur web indépendant · Steenvoorde (59114)<br>
  <a href="mailto:benjamin.bourger92@gmail.com">benjamin.bourger92@gmail.com</a> · 06.63.78.57.62
</div>

</body>
</html>`;
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function collectFiles(dir, base = dir) {
  let files = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, collectFiles(full, base));
    } else {
      const rel = "/" + path.relative(base, full).replace(/\\/g, "/");
      files[rel] = fs.readFileSync(full);
    }
  }
  return files;
}

async function deployerNetlify(dossier, existingSiteId = null) {
  try {
    const files = collectFiles(dossier);
    const fileHashes = {};
    for (const [filePath, content] of Object.entries(files)) {
      fileHashes[filePath] = crypto.createHash("sha1").update(content).digest("hex");
    }

    let siteId, deployId, siteUrl;

    if (existingSiteId) {
      // Redéployer sur un site existant
      const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${existingSiteId}/deploys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${NETLIFY_TOKEN}` },
        body: JSON.stringify({ files: fileHashes }),
      });
      if (!deployRes.ok) {
        const errBody = await deployRes.json().catch(() => ({}));
        console.warn(`   ⚠️   Netlify redeploy: ${deployRes.status} ${errBody.message || ""}`);
        return { url: null, siteId: existingSiteId };
      }
      const deploy = await deployRes.json();
      siteId = existingSiteId;
      deployId = deploy.id;
      siteUrl = deploy.ssl_url || deploy.url;
    } else {
      // Créer un nouveau site
      const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${NETLIFY_TOKEN}` },
        body: JSON.stringify({ files: fileHashes }),
      });
      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        if (createRes.status === 401) {
          console.warn("   ⚠️   Netlify 401 — vérifiez NETLIFY_TOKEN dans .env");
        } else {
          console.warn(`   ⚠️   Netlify create site: ${createRes.status} ${errBody.message || ""}`);
        }
        return { url: null, siteId: null };
      }
      const site = await createRes.json();
      siteId = site.id;
      deployId = site.deploy_id;
      siteUrl = site.ssl_url || site.url;
    }

    // Uploader tous les fichiers (sites vitrines légers — pas besoin d'optimiser par SHA)
    for (const filePath of Object.keys(fileHashes)) {
      const uploadRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}/files${filePath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream", Authorization: `Bearer ${NETLIFY_TOKEN}` },
        body: files[filePath],
      });
      if (!uploadRes.ok) {
        console.warn(`   ⚠️   Upload ${filePath}: ${uploadRes.status}`);
      }
    }

    // Attendre que le deploy soit ready (max 30s)
    for (let i = 0; i < DEPLOY_POLL_MAX_ATTEMPTS; i++) {
      await wait(DEPLOY_POLL_INTERVAL_MS);
      const statusRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
        headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` },
      });
      if (!statusRes.ok) break;
      const deploy = await statusRes.json();
      if (deploy.state === "ready") {
        return { url: deploy.ssl_url || deploy.deploy_ssl_url || deploy.url || null, siteId };
      }
      if (deploy.state === "error") {
        console.warn(`   ⚠️   Deploy échoué: ${deploy.error_message || "erreur inconnue"}`);
        return { url: null, siteId };
      }
    }

    // Timeout — le deploy n'a pas confirmé "ready" en 30s
    console.warn("   ⚠️   Deploy non confirmé après 30s — URL potentiellement instable");
    const fallbackUrl = siteUrl?.replace(/^http:/, "https:") || null;
    return { url: fallbackUrl, siteId };
  } catch (err) {
    console.warn("   ⚠️   Netlify :", err.message?.slice(0, 120));
    return { url: null, siteId: null };
  }
}

// ─── Traitement d'un prospect ─────────────────────────────────────────────────

async function traiterProspect(prospect, mode, concurrents = null) {
  const slug = slugify(prospect.nom);
  const dossier = path.join(__dirname, "output", slug);
  fs.mkdirSync(dossier, { recursive: true });

  // Analyser le site existant si disponible
  let analyse = null;
  if (prospect.site_url) {
    analyse = await analyserSiteExistant(prospect.site_url);
    if (analyse) {
      console.log(`   📊  Site actuel : ${analyse.note_globale}/10 — ${(analyse.resume_analyse || "").slice(0, 80)}`);
    }
  }

  // Chercher un site_id existant dans le CRM pour éviter les sites orphelins
  const crmForId = chargerCRM();
  const existingEntry = crmForId.prospects.find((p) => p.nom.toLowerCase().trim() === prospect.nom.toLowerCase().trim() && p.ville.toLowerCase().trim() === prospect.ville.toLowerCase().trim());
  const existingDemoSiteId = existingEntry?.netlify_demo_site_id || null;
  const existingPropSiteId = existingEntry?.netlify_prop_site_id || null;

  // Générer le site
  let demoUrl = null;
  let demoSiteId = null;
  if (mode === "astro") {
    await genererMaquetteAstro(prospect, dossier);
    let deployDir = dossier;
    try {
      execSync("npm install", { cwd: dossier, stdio: "pipe" });
      execSync("npm run build", { cwd: dossier, stdio: "pipe" });
      deployDir = path.join(dossier, "dist");
      console.log("   🏗️   Build Astro OK");
    } catch (buildErr) {
      const stderr = buildErr.stderr?.toString().slice(0, 300) || "";
      console.warn(`   ⚠️   Build Astro échoué${stderr ? ": " + stderr : ""}, déploiement dossier source`);
    }
    console.log("\n🚀  Déploiement maquette...");
    const demoResult = await deployerNetlify(deployDir, existingDemoSiteId);
    demoUrl = demoResult.url;
    demoSiteId = demoResult.siteId;
  } else {
    const html = await genererMaquetteHTML(prospect, analyse, concurrents);
    fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");
    console.log("\n🚀  Déploiement maquette...");
    const demoResult = await deployerNetlify(dossier, existingDemoSiteId);
    demoUrl = demoResult.url;
    demoSiteId = demoResult.siteId;
  }

  if (demoUrl) console.log(`   🌐  Démo : ${demoUrl}`);

  // Générer + déployer la page de présentation
  const pagePresentation = genererPagePresentation(prospect, demoUrl);
  fs.writeFileSync(path.join(dossier, "PROPOSITION.html"), pagePresentation, "utf8");

  const presentDir = path.join(__dirname, "output", `${slug}-proposition`);
  fs.mkdirSync(presentDir, { recursive: true });
  fs.writeFileSync(path.join(presentDir, "index.html"), pagePresentation, "utf8");
  console.log("🚀  Déploiement page de présentation...");
  const propResult = await deployerNetlify(presentDir, existingPropSiteId);
  const propositionUrl = propResult.url;
  const propSiteId = propResult.siteId;
  if (propositionUrl) console.log(`   📋  Proposition : ${propositionUrl}`);

  // Mettre à jour le CRM avec les URLs + site IDs (réutilisés au prochain deploy)
  const crm = chargerCRM();
  const entry = crm.prospects.find((p) => p.nom.toLowerCase().trim() === prospect.nom.toLowerCase().trim() && p.ville.toLowerCase().trim() === prospect.ville.toLowerCase().trim());
  if (entry) {
    entry.url_demo = demoUrl;
    entry.url_proposition = propositionUrl;
    entry.netlify_demo_site_id = demoSiteId;
    entry.netlify_prop_site_id = propSiteId;
  }
  fs.writeFileSync(CRM_FILE, JSON.stringify(crm, null, 2), "utf8");

  return { nom: prospect.nom, slug, dossier, demoUrl, propositionUrl };
}

// ─── Rapport final ────────────────────────────────────────────────────────────

function genererRapport(prospectsData, resultats, query) {
  const date = new Date().toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });
  const E = { SANS_SITE:"🔴", SITE_OBSOLETE:"🟠", SITE_BASIQUE:"🟡", SITE_CORRECT:"🟢" };
  const P = { HAUTE:"⭐⭐⭐", MOYENNE:"⭐⭐", FAIBLE:"⭐" };

  let r = `# Rapport Prospects — ${date}\n**Requête :** ${query}\n\n`;
  if (prospectsData.resume) r += `> ${prospectsData.resume}\n\n`;
  r += `---\n\n## 📊 Vue d'ensemble\n\n| Entreprise | Ville | Statut | Priorité | Tél |\n|---|---|---|---|---|\n`;
  for (const p of prospectsData.prospects || []) {
    r += `| ${p.nom} | ${p.ville} | ${E[p.statut]||""} ${p.statut} | ${P[p.priorite]||""} | ${p.telephone||"—"} |\n`;
  }

  r += `\n---\n\n## 🎯 Fiches détaillées\n\n`;
  for (const p of prospectsData.prospects || []) {
    r += `### ${E[p.statut]||""} ${p.nom} · ${p.ville}\n`;
    r += `**Activité :** ${p.activite} · **Priorité :** ${P[p.priorite]||""}\n`;
    if (p.telephone) r += `**Tél :** ${p.telephone}  `;
    if (p.email) r += `**Email :** ${p.email}`;
    r += "\n";
    r += `**Situation :** ${p.raison}\n`;
    r += `**Argument :** *"${p.argument_commercial}"*\n`;
    const res = resultats.find((x) => x.nom === p.nom);
    if (res?.demoUrl) r += `**🌐 Démo :** ${res.demoUrl}\n`;
    if (res?.propositionUrl) r += `**📋 Proposition à envoyer :** ${res.propositionUrl}\n`;
    r += "\n";
  }

  if (prospectsData.concurrents?.concurrents?.length) {
    r += `---\n\n## 🏆 Analyse concurrentielle\n\n`;
    if (prospectsData.concurrents.benchmark_resume) {
      r += `> ${prospectsData.concurrents.benchmark_resume}\n\n`;
    }
    for (const c of prospectsData.concurrents.concurrents) {
      r += `### ${c.nom}\n`;
      if (c.url) r += `**Site :** ${c.url}\n`;
      if (c.points_forts?.length)   r += `**Points forts :** ${c.points_forts.join(", ")}\n`;
      if (c.points_faibles?.length) r += `**Points faibles :** ${c.points_faibles.join(", ")}\n`;
      if (c.argument_comparatif)    r += `**Argument :** *"${c.argument_comparatif}"*\n`;
      r += "\n";
    }
  }

  r += `---\n\n## 📞 Scripts de contact — Top 3\n\n`;
  for (const nom of (prospectsData.top3 || []).slice(0, 3)) {
    const p = prospectsData.prospects?.find((x) => x.nom === nom);
    if (!p) continue;
    const res = resultats.find((x) => x.nom === p.nom);
    r += `### ${p.nom} · ${p.telephone || "pas de tél trouvé"}\n\n`;
    r += `**Appel :**\n> "Bonjour, je m'appelle Benjamin Bourger, développeur web basé à Steenvoorde.\n`;
    r += `> ${p.statut === "SANS_SITE"
      ? `En cherchant ${p.activite.toLowerCase()} sur Google dans le secteur de ${p.ville}, votre entreprise n'apparaît pas. Je pense que vous perdez des clients chaque semaine sans le savoir.`
      : `J'ai regardé votre site — il ne vous rend vraiment pas justice par rapport à votre travail.`}\n`;
    r += `> ${p.argument_commercial}\n`;
    r += `> J'ai d'ailleurs déjà préparé une ébauche. Est-ce que vous avez 5 minutes cette semaine pour que je vous la montre ?"\n\n`;
    if (res?.propositionUrl) {
      r += `**SMS avec lien démo :**\n> "Bonjour [Prénom], c'est Benjamin de Steenvoorde. Comme promis, voici un aperçu de ce que pourrait être votre site : ${res.propositionUrl} — Dites-moi ce que vous en pensez !"\n\n`;
    }
  }

  r += `---\n\n## ⏱️ Planning de relances\n\n| Délai | Action |\n|---|---|\n`;
  r += `| J+0 | Premier appel ou visite |\n`;
  r += `| J+2 | SMS de suivi si pas de réponse |\n`;
  r += `| J+5 | Envoyer le lien proposition par SMS/WhatsApp |\n`;
  r += `| J+10 | Relance email |\n`;
  r += `| J+21 | Dernière tentative : "Je passe dans le coin" |\n`;

  return r;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(path.join(__dirname, "output"))) fs.mkdirSync(path.join(__dirname, "output"));

  // 1. Recherche
  const prospectsData = await rechercherProspects(query);
  if (!prospectsData?.prospects?.length) { console.error("❌  Aucun prospect."); process.exit(1); }

  // Tableau terminal
  const prospects = prospectsData.prospects;
  console.log(`\n✅  ${prospects.length} prospects\n`);
  const c = (s, n) => String(s||"").padEnd(n).slice(0, n);
  console.log("┌" + "─".repeat(73) + "┐");
  console.log("│  " + c("Entreprise",26) + "  " + c("Statut",14) + "  " + c("Priorité",10) + "  " + c("Téléphone",15) + "  │");
  console.log("├" + "─".repeat(73) + "┤");
  for (const p of prospects) console.log("│  " + c(p.nom,26) + "  " + c(p.statut,14) + "  " + c(p.priorite,10) + "  " + c(p.telephone||"—",15) + "  │");
  console.log("└" + "─".repeat(73) + "┘\n");

  ajouterAuCRM(prospects, query);

  if (index) {
    const rapport = genererRapport(prospectsData, [], query);
    const rp = path.join(__dirname, "output", `rapport-${Date.now()}.md`);
    fs.writeFileSync(rp, rapport, "utf8");
    console.log(`\n📋  Rapport : ${rp}\n`);
    return;
  }

  // 2. Cibles à traiter
  const cibles = tous
    ? prospects.filter((p) => p.priorite === "HAUTE")
    : [prospects.find((p) => p.nom === prospectsData.top3?.[0]) || prospects[0]];

  if (tous) console.log(`🎯  Traitement de ${cibles.length} prospects HAUTE priorité\n`);

  const resultats = [];
  for (let i = 0; i < cibles.length; i++) {
    const prospect = cibles[i];
    if (tous && i > 0) {
      console.log("\n⏳  Pause 45s avant le prospect suivant...\n");
      await wait(INTER_PROSPECT_PAUSE_MS);
    }
    console.log(`\n${"─".repeat(60)}\n🎨  Traitement : "${prospect.nom}" — ${prospect.activite}\n${"─".repeat(60)}`);
    const res = await traiterProspect(prospect, mode, prospectsData.concurrents);
    resultats.push(res);
  }

  // 3. Rapport
  const rapport = genererRapport(prospectsData, resultats, query);
  const rapportPath = path.join(__dirname, "output", `rapport-${Date.now()}.md`);
  fs.writeFileSync(rapportPath, rapport, "utf8");

  // 4. Résumé
  console.log("\n" + "═".repeat(72));
  console.log("  ✅  TERMINÉ");
  console.log("═".repeat(72));
  console.log(`  📋  Rapport        : ${rapportPath}`);
  console.log(`  📊  CRM            : crm.json`);
  for (const r of resultats) {
    console.log(`\n  🏢  ${r.nom}`);
    console.log(`  💾  Dossier        : output/${r.slug}/`);
    if (r.demoUrl)        console.log(`  🌐  Démo           : ${r.demoUrl}`);
    if (r.propositionUrl) console.log(`  📋  → À envoyer    : ${r.propositionUrl}`);
  }
  console.log("\n" + "═".repeat(72) + "\n");
}

main().catch((e) => { console.error("\n❌", e.message); process.exit(1); });
