/**
 * scoring.js — Module de scoring prospect (extrait de prospect.js)
 */

export function calculerScore(prospect) {
  let score = 0;
  const statut = prospect.statut || prospect.statut_web || "";
  const rating = prospect.noteGoogle ?? prospect.note_google ?? null;
  const nbAvis = prospect.nbAvisGoogle ?? prospect.nb_avis ?? 0;
  const horaires = prospect.horaires || [];
  const hasConcurrentAvecBeauSite = prospect._concurrentAvecBeauSite || false;

  // Statut web
  if (statut === "SANS_SITE")     score += 40;
  if (statut === "SITE_OBSOLETE") score += 20;
  if (statut === "SITE_BASIQUE")  score += 10;

  // Site HTTP non HTTPS (détectable si siteUrl commence par http://)
  const siteUrl = prospect.siteUrl || prospect.site_url || "";
  if (siteUrl && siteUrl.startsWith("http://")) score += 30;

  // Note Google
  if (rating !== null) {
    if (rating < 3.5)  score += 10;
    if (rating >= 4.5) score += 15;
  }

  // Nombre d'avis
  if (nbAvis > 20) score += 10;

  // Horaires renseignés
  if (horaires && horaires.length > 0) score += 5;

  // Concurrent avec beau site = douleur concurrentielle
  if (hasConcurrentAvecBeauSite) score += 15;

  // Priorité dérivée
  let priorite = "FAIBLE";
  if (score >= 60) priorite = "HAUTE";
  else if (score >= 30) priorite = "MOYENNE";

  return { score, priorite };
}
