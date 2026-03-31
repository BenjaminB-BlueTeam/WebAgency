import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PrintTrigger, PrintButton } from "@/components/print/print-trigger";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export default async function FacturePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [facture, parametres] = await Promise.all([
    db.facture.findUnique({
      where: { id },
      include: {
        prospect: {
          select: {
            nom: true,
            ville: true,
            activite: true,
            telephone: true,
            email: true,
            adresse: true,
          },
        },
        devis: {
          select: { reference: true, offre: true },
        },
      },
    }),
    db.parametre.findMany(),
  ]);

  if (!facture) notFound();

  const param = (key: string, fallback = "") =>
    parametres.find((p) => p.cle === key)?.valeur ?? fallback;

  const nom = param("profil_nom", "Benjamin Bourger");
  const adresse = param("profil_adresse", "Steenvoorde, 59114 Nord");
  const tel = param("profil_telephone", "06.63.78.57.62");
  const email = param("profil_email", "benjamin.bourger92@gmail.com");
  const siret = param("profil_siret", "");

  const tva = Math.round((facture.montantTTC - facture.montantHT) * 100) / 100;
  const resteAPayer =
    facture.montantAcompte != null
      ? Math.round((facture.montantTTC - facture.montantAcompte) * 100) / 100
      : null;

  const statuts: Record<string, { label: string; color: string }> = {
    EN_ATTENTE: { label: "En attente", color: "#d97706" },
    PARTIELLEMENT_PAYEE: { label: "Acompte reçu", color: "#7c3aed" },
    PAYEE: { label: "Payée", color: "#16a34a" },
    RETARD: { label: "Retard de paiement", color: "#dc2626" },
    ANNULEE: { label: "Annulée", color: "#6b7280" },
  };
  const statutInfo = statuts[facture.statut] ?? { label: facture.statut, color: "#6b7280" };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 13px;
          color: #1a1a1a;
          background: white;
          padding: 40px;
          max-width: 820px;
          margin: 0 auto;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
        .prestataire h1 { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
        .prestataire p { color: #666; font-size: 12px; line-height: 1.6; }
        .doc-info { text-align: right; }
        .doc-label { font-size: 28px; font-weight: 800; color: #1d4ed8; letter-spacing: 2px; text-transform: uppercase; }
        .doc-ref { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
        .doc-meta { font-size: 12px; color: #666; margin-top: 4px; line-height: 1.6; }
        .status-badge {
          display: inline-block;
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          margin-top: 8px;
          border: 1.5px solid;
        }
        .divider { height: 2px; background: linear-gradient(90deg, #1d4ed8, #60a5fa); border-radius: 2px; margin: 24px 0; }
        .thin-divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
        .client-section { background: #eff6ff; border-left: 3px solid #1d4ed8; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }
        .client-section h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; margin-bottom: 8px; }
        .client-section strong { font-size: 15px; font-weight: 700; color: #1a1a1a; display: block; }
        .client-section p { font-size: 12px; color: #555; margin-top: 2px; }
        .prestation-section { margin-bottom: 28px; }
        .prestation-section h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; }
        .prestation-row { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 14px; background: #f9fafb; border-radius: 6px; }
        .prestation-row span:first-child { font-weight: 600; color: #1a1a1a; flex: 1; }
        .totals { margin-left: auto; width: 300px; margin-bottom: 24px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #555; }
        .total-row.ht { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 4px; }
        .total-row.ttc { font-size: 17px; font-weight: 700; color: #1a1a1a; padding-top: 8px; }
        .total-row.ttc span:last-child { color: #1d4ed8; }
        .total-row.acompte { color: #7c3aed; font-weight: 600; }
        .total-row.reste { font-size: 15px; font-weight: 700; color: #dc2626; padding-top: 6px; border-top: 2px solid #fee2e2; margin-top: 6px; }
        .notes-section { background: #f9fafb; padding: 14px; border-radius: 8px; margin-bottom: 28px; }
        .notes-section h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
        .notes-section p { font-size: 12px; color: #555; line-height: 1.6; }
        .conditions { font-size: 11px; color: #888; line-height: 1.7; margin-bottom: 28px; }
        .payment-info { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
        .payment-info h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; margin-bottom: 8px; }
        .payment-info p { font-size: 12px; color: #555; line-height: 1.6; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #bbb; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .print-btn {
          position: fixed;
          top: 20px; right: 20px;
          background: #1d4ed8;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(29,78,216,0.4);
        }
        .print-btn:hover { background: #2563eb; }
        @media print {
          .print-btn { display: none; }
          body { padding: 20px; }
          @page { margin: 20mm; size: A4; }
        }
      `}</style>

      <PrintTrigger />

      <PrintButton className="print-btn" />

      {/* Header */}
      <div className="header">
        <div className="prestataire">
          <h1>{nom}</h1>
          <p>
            Développeur web indépendant<br />
            {adresse}<br />
            {tel}<br />
            {email}
            {siret && <><br />SIRET : {siret}</>}
          </p>
        </div>
        <div className="doc-info">
          <div className="doc-label">Facture</div>
          <div className="doc-ref">{facture.reference}</div>
          <div className="doc-meta">
            Émise le {fmtDate(facture.dateCreation)}<br />
            {facture.dateEcheance && <>Échéance : {fmtDate(facture.dateEcheance)}<br /></>}
            {facture.devis && <>Devis : {facture.devis.reference}</>}
          </div>
          <div
            className="status-badge"
            style={{ color: statutInfo.color, borderColor: statutInfo.color, backgroundColor: `${statutInfo.color}15` }}
          >
            {statutInfo.label}
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Client */}
      <div className="client-section">
        <h2>Facturer à</h2>
        <strong>{facture.prospect.nom}</strong>
        <p>{facture.prospect.activite}</p>
        {facture.prospect.adresse && <p>{facture.prospect.adresse}</p>}
        {!facture.prospect.adresse && <p>{facture.prospect.ville}</p>}
        {facture.prospect.telephone && <p>Tél : {facture.prospect.telephone}</p>}
        {facture.prospect.email && <p>{facture.prospect.email}</p>}
      </div>

      {/* Prestation */}
      <div className="prestation-section">
        <h2>Prestation</h2>
        <div className="prestation-row">
          <span>
            {facture.devis?.offre ?? "Prestation de développement web"}
          </span>
          <span style={{ fontWeight: 700, color: "#1a1a1a", marginLeft: 24 }}>
            {fmt(facture.montantHT)} €
          </span>
        </div>
      </div>

      {/* Totaux */}
      <div className="totals">
        <div className="total-row ht">
          <span>Montant HT</span>
          <span>{fmt(facture.montantHT)} €</span>
        </div>
        <div className="total-row">
          <span>TVA (20 %)</span>
          <span>{fmt(tva)} €</span>
        </div>
        <div className="total-row ttc">
          <span>Total TTC</span>
          <span>{fmt(facture.montantTTC)} €</span>
        </div>
        {facture.montantAcompte != null && (
          <>
            <div className="total-row acompte" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
              <span>Acompte reçu {facture.dateAcompte ? `(${fmtDate(facture.dateAcompte)})` : ""}</span>
              <span>- {fmt(facture.montantAcompte)} €</span>
            </div>
            {resteAPayer != null && (
              <div className="total-row reste">
                <span>Reste à payer</span>
                <span>{fmt(resteAPayer)} €</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="thin-divider" />

      {/* Paiement reçu */}
      {facture.statut === "PAYEE" && (
        <div className="payment-info">
          <h2>Règlement reçu</h2>
          <p>
            Facture soldée le {fmtDate(facture.datePaiement)}.
            Merci pour votre confiance.
          </p>
        </div>
      )}

      {/* Notes */}
      {facture.notes && (
        <div className="notes-section">
          <h2>Notes</h2>
          <p>{facture.notes}</p>
        </div>
      )}

      {/* Conditions */}
      <div className="conditions">
        <strong style={{ color: "#555" }}>Modalités de paiement :</strong><br />
        Règlement par virement bancaire ou chèque à l&apos;ordre de {nom}.<br />
        Toute facture non réglée dans les délais prévus entraîne des pénalités de retard<br />
        au taux légal en vigueur, majorées d&apos;une indemnité forfaitaire de 40 €.
      </div>

      {/* Footer */}
      <div className="footer">
        {nom} — {adresse} — {tel} — {email}
        {siret && ` — SIRET : ${siret}`}
      </div>
    </>
  );
}
