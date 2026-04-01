export interface ProspectForScoring {
  statut: string;
  siteUrl?: string | null;
  noteGoogle?: number | null;
  nbAvisGoogle?: number | null;
  horaires?: string | null;
}

export function calculerScore(prospect: ProspectForScoring): { score: number; priorite: string } {
  let score = 0;
  const statut = prospect.statut || '';
  const siteUrl = prospect.siteUrl || '';
  const rating = prospect.noteGoogle ?? null;
  const nbAvis = prospect.nbAvisGoogle ?? 0;
  const hasHoraires = !!prospect.horaires;

  if (statut === 'SANS_SITE') score += 40;
  else if (statut === 'SITE_OBSOLETE') score += 20;
  else if (statut === 'SITE_BASIQUE') score += 10;

  if (siteUrl && siteUrl.startsWith('http://')) score += 30;
  if (rating !== null && rating < 3.5) score += 10;
  if (rating !== null && rating >= 4.5) score += 15;
  if (nbAvis > 20) score += 10;
  if (hasHoraires) score += 5;

  let priorite = 'FAIBLE';
  if (score >= 60) priorite = 'HAUTE';
  else if (score >= 30) priorite = 'MOYENNE';

  return { score, priorite };
}
