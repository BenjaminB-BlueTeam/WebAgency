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
