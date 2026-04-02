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
  const { nom, activite, ville, statut, argumentCommercial, siteUrl, demoUrl, benjaminTel, benjaminEmail } = ctx;

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
  "corps": "corps de l'email complet avec retours à la ligne sous forme \\n",
  "variante_sms": "version courte < 300 chars pour SMS/WhatsApp, ton direct, sans formule de politesse"
}`;
}
