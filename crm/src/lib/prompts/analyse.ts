// crm/src/lib/prompts/analyse.ts

export interface AnalyseInput {
  prospect: {
    nom: string;
    activite: string;
    ville: string;
    statut: string;
    noteGoogle?: number | null;
    nbAvisGoogle?: number | null;
    siteUrl?: string | null;
    siteContent?: string; // scraped markdown
  };
  concurrents: Array<{
    nom: string;
    url?: string;
    noteGoogle?: number;
    nbAvis?: number;
    siteContent?: string;
  }>;
}

export interface AnalyseResult {
  audit_site: {
    note: number;
    stack: string;
    sections_manquantes: string[];
    signaux_conversion_absents: string[];
    resume: string;
  } | null;
  benchmark: Array<{
    nom: string;
    url: string;
    note: number;
    points_forts: string[];
    points_faibles: string[];
  }>;
  standard_secteur: string[];
  opportunites_differenciation: string[];
  analyse_seo: {
    google_business: string;
    mots_cles_manquants: string[];
    comparaison_avis: string;
  };
  argumentaire: {
    arguments_chocs: string[];
    reponses_objections: Array<{ objection: string; reponse: string }>;
    prix_recommande: string;
  };
  prompt_maquette_enrichi: string;
}

export function getAnalysePrompt(input: AnalyseInput): string {
  const { prospect, concurrents } = input;

  const concurrentsText = concurrents.map(c => `
--- CONCURRENT : ${c.nom} ---
URL : ${c.url ?? "inconnue"}
Note Google : ${c.noteGoogle ?? "N/A"} (${c.nbAvis ?? 0} avis)
Contenu site :
${c.siteContent ? c.siteContent.slice(0, 2000) : "Site non scrappé ou inexistant"}
`).join("\n");

  return `Tu es un expert marketing digital avec 20 ans d'expérience, spécialisé dans les TPE et artisans locaux français. Tu maîtrises les méthodes actuelles : SEO local, Google Business Profile, design mobile-first, Core Web Vitals, copywriting de conversion.

PROSPECT À ANALYSER :
Nom : ${prospect.nom}
Activité : ${prospect.activite}
Ville : ${prospect.ville}
Statut web : ${prospect.statut}
Note Google : ${prospect.noteGoogle ?? "N/A"} (${prospect.nbAvisGoogle ?? 0} avis)
${prospect.siteUrl ? `URL site actuel : ${prospect.siteUrl}` : "SANS SITE"}

${prospect.siteContent ? `CONTENU DU SITE ACTUEL :
${prospect.siteContent.slice(0, 3000)}` : ""}

CONCURRENTS IDENTIFIÉS :
${concurrentsText}

Effectue une analyse marketing APPROFONDIE. Pour chaque point, cite des éléments concrets tirés du contenu scrappé.

Analyse les dimensions suivantes :
1. Design et modernité (animations, mobile-first, typographie, hiérarchie visuelle)
2. SEO local (balises title/meta, structured data Local Business, cohérence NAP, mots-clés métier + ville)
3. Avis Google (volume, note, réponses du propriétaire, récence)
4. Conversion (CTA above the fold, formulaire de contact, téléphone cliquable, gallery/réalisations)
5. Contenu (présence des services, horaires, zone géographique, témoignages)
6. Différenciation (ce que personne dans le secteur ne fait encore)

Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires :
{
  "audit_site": ${prospect.siteUrl ? `{
    "note": <0-10>,
    "stack": "<WordPress X.Y / Wix / HTML5 / etc.>",
    "sections_manquantes": ["..."],
    "signaux_conversion_absents": ["..."],
    "resume": "<2-3 phrases percutantes sur les problèmes principaux>"
  }` : "null"},
  "benchmark": [
    {
      "nom": "...",
      "url": "...",
      "note": <0-10>,
      "points_forts": ["...", "..."],
      "points_faibles": ["...", "..."]
    }
  ],
  "standard_secteur": ["<ce que tous les bons sites du secteur ont>"],
  "opportunites_differenciation": ["<ce qu'aucun concurrent local ne fait encore>"],
  "analyse_seo": {
    "google_business": "<état du profil GBP>",
    "mots_cles_manquants": ["..."],
    "comparaison_avis": "<analyse comparative chiffrée>"
  },
  "argumentaire": {
    "arguments_chocs": ["<argument 1 ultra-spécifique>", "<argument 2>", "<argument 3>"],
    "reponses_objections": [
      {"objection": "...", "reponse": "..."},
      {"objection": "...", "reponse": "..."},
      {"objection": "...", "reponse": "..."}
    ],
    "prix_recommande": "<fourchette ou montant avec justification>"
  },
  "prompt_maquette_enrichi": "<instructions précises pour Claude pour générer la maquette en corrigeant les lacunes identifiées, mentionnant les opportunités de différenciation, avec les services exacts et le ton adapté à l'activité>"
}`;
}
