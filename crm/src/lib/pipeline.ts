// crm/src/lib/pipeline.ts
import { db } from "@/lib/db";

type PipelineAction =
  | "EMAIL_ENVOYE"
  | "RDV"
  | "DEVIS_CREE"
  | "DEVIS_ACCEPTE"
  | "MAQUETTE_VALIDEE";

const ORDRE: Record<string, number> = {
  PROSPECT: 0,
  CONTACTE: 1,
  RDV: 2,
  DEVIS: 3,
  SIGNE: 4,
  LIVRE: 5,
};

export async function avancerPipeline(
  prospectId: string,
  action: PipelineAction
): Promise<void> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: { id: true, statutPipeline: true },
  });
  if (!prospect) return;

  const current = ORDRE[prospect.statutPipeline] ?? 0;

  const transitions: Record<PipelineAction, {
    requires: number;
    target: string;
    dateField?: string;
  }> = {
    EMAIL_ENVOYE: { requires: 0, target: "CONTACTE", dateField: "dateContact" },
    RDV: { requires: 1, target: "RDV", dateField: "dateRdv" },
    DEVIS_CREE: { requires: 2, target: "DEVIS", dateField: "dateDevis" },
    DEVIS_ACCEPTE: { requires: 3, target: "SIGNE", dateField: "dateSignature" },
    MAQUETTE_VALIDEE: { requires: 4, target: "LIVRE", dateField: "dateLivraison" },
  };

  const t = transitions[action];
  if (!t) return;

  // Only advance — never regress
  if (current > t.requires) return;
  if (ORDRE[t.target] <= current) return;

  const data: Record<string, unknown> = { statutPipeline: t.target };
  if (t.dateField) data[t.dateField] = new Date();

  await db.prospect.update({ where: { id: prospectId }, data });
}
