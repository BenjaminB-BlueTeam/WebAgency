import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await db.prospect.findUnique({ where: { id } });
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const siteInfo = prospect.siteUrl
    ? `Site actuel : ${prospect.siteUrl} (statut: ${prospect.statut})`
    : 'Prospect SANS SITE';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Tu es un expert marketing web avec 20 ans d'expérience. Analyse le prospect suivant et ses concurrents locaux.

PROSPECT : ${prospect.nom} — ${prospect.activite} — ${prospect.ville}
${siteInfo}
Note Google : ${prospect.noteGoogle ?? 'N/A'} (${prospect.nbAvisGoogle ?? 0} avis)

Effectue une analyse concurrentielle approfondie :
1. Recherche 2-3 concurrents directs dans ${prospect.ville} et environs
2. Compare : présence web, qualité site, SEO, design, animations, avis Google
3. Identifie ce que les concurrents ont que le prospect n'a pas
4. Identifie les avantages du prospect vs concurrents
5. Fournis un argumentaire de vente percutant pour lui proposer un site

Réponds en JSON :
{
  "concurrents": [{"nom": "...", "url": "...", "points_forts": "...", "note_google": null}],
  "avantages_prospect": ["..."],
  "manques_prospect": ["..."],
  "analyse_seo": "...",
  "analyse_design": "...",
  "analyse_avis": "...",
  "argumentaire_vente": "...",
  "prompt_maquette_enrichi": "Instructions spécifiques pour la maquette basées sur cette analyse..."
}`
    }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  let analyse;
  try { analyse = JSON.parse(text.replace(/```json\n?|\n?```/g, '')); }
  catch { analyse = { error: 'Parse error', raw: text }; }

  await db.prospect.update({
    where: { id },
    data: { notes: JSON.stringify({ analyse_concurrentielle: analyse, date: new Date().toISOString() }) }
  });

  await db.activite.create({
    data: { prospectId: id, type: 'ANALYSE', description: 'Analyse concurrentielle effectuée' }
  });

  return NextResponse.json(analyse);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await db.prospect.findUnique({ where: { id } });
  if (!prospect || !prospect.notes) return NextResponse.json(null);
  try {
    const notes = JSON.parse(prospect.notes as string);
    return NextResponse.json(notes.analyse_concurrentielle ?? null);
  } catch { return NextResponse.json(null); }
}
