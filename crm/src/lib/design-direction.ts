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
