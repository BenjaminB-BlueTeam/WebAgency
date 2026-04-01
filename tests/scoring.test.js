import { describe, it, expect } from 'vitest';
import { calculerScore } from '../scoring.js';

describe('calculerScore', () => {
  it('SANS_SITE seul doit retourner score >= 40 et priorité MOYENNE', () => {
    const { score, priorite } = calculerScore({ statut: 'SANS_SITE' });
    expect(score).toBeGreaterThanOrEqual(40);
    expect(priorite).toBe('MOYENNE');
  });

  it('SANS_SITE avec signaux forts doit retourner priorité HAUTE', () => {
    const { score, priorite } = calculerScore({ statut: 'SANS_SITE', noteGoogle: 4.8, nbAvisGoogle: 25 });
    expect(score).toBeGreaterThanOrEqual(60);
    expect(priorite).toBe('HAUTE');
  });

  it('SITE_OBSOLETE sans HTTP doit retourner priorité HAUTE ou MOYENNE', () => {
    const { score, priorite } = calculerScore({ statut: 'SITE_OBSOLETE', noteGoogle: 4.8, nbAvisGoogle: 25 });
    expect(score).toBeGreaterThan(0);
    expect(['HAUTE', 'MOYENNE']).toContain(priorite);
  });

  it('Site HTTP doit ajouter 30 points', () => {
    const avecHTTP = calculerScore({ statut: 'SITE_BASIQUE', siteUrl: 'http://example.com' });
    const sansHTTP = calculerScore({ statut: 'SITE_BASIQUE', siteUrl: 'https://example.com' });
    expect(avecHTTP.score).toBe(sansHTTP.score + 30);
  });

  it('Note Google >= 4.5 doit ajouter 15 points', () => {
    const avec = calculerScore({ statut: 'SITE_BASIQUE', noteGoogle: 4.8 });
    const sans = calculerScore({ statut: 'SITE_BASIQUE', noteGoogle: null });
    expect(avec.score).toBe(sans.score + 15);
  });

  it('Plus de 20 avis Google doit ajouter 10 points', () => {
    const avec = calculerScore({ statut: 'SITE_BASIQUE', nbAvisGoogle: 25 });
    const sans = calculerScore({ statut: 'SITE_BASIQUE', nbAvisGoogle: 5 });
    expect(avec.score).toBe(sans.score + 10);
  });

  it('Score FAIBLE si statut SITE_CORRECT sans autres signaux', () => {
    const { priorite } = calculerScore({ statut: 'SITE_CORRECT' });
    expect(priorite).toBe('FAIBLE');
  });
});
