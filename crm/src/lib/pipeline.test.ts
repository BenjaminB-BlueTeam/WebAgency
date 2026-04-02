// crm/src/lib/pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    prospect: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { avancerPipeline } from "./pipeline";
import { db } from "@/lib/db";

describe("avancerPipeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PROSPECT → CONTACTE quand EMAIL_ENVOYE", async () => {
    vi.mocked(db.prospect.findUnique).mockResolvedValue({
      id: "p1", statutPipeline: "PROSPECT"
    } as never);
    vi.mocked(db.prospect.update).mockResolvedValue({} as never);

    await avancerPipeline("p1", "EMAIL_ENVOYE");

    expect(db.prospect.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { statutPipeline: "CONTACTE", dateContact: expect.any(Date) },
    });
  });

  it("ne régresse pas : DEVIS reste DEVIS sur EMAIL_ENVOYE", async () => {
    vi.mocked(db.prospect.findUnique).mockResolvedValue({
      id: "p1", statutPipeline: "DEVIS"
    } as never);

    await avancerPipeline("p1", "EMAIL_ENVOYE");

    expect(db.prospect.update).not.toHaveBeenCalled();
  });

  it("CONTACTE → RDV quand action RDV", async () => {
    vi.mocked(db.prospect.findUnique).mockResolvedValue({
      id: "p1", statutPipeline: "CONTACTE"
    } as never);
    vi.mocked(db.prospect.update).mockResolvedValue({} as never);

    await avancerPipeline("p1", "RDV");

    expect(db.prospect.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { statutPipeline: "RDV", dateRdv: expect.any(Date) },
    });
  });
});
