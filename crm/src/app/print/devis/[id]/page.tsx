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

export default async function DevisPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [devis, parametres] = await Promise.all([
    db.devis.findUnique({
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
      },
    }),
    db.parametre.findMany(),
  ]);

  if (!devis) notFound();

  const param = (key: string, fallback = "") =>
    parametres.find((p) => p.cle === key)?.valeur ?? fallback;

  const nom = param("profil_nom", "Benjamin Bourger");
  const adresse = param("profil_adresse", "Steenvoorde, 59114 Nord");
  const tel = param("profil_telephone", "06.63.78.57.62");
  const email = param("profil_email", "benjamin.bourger92@gmail.com");
  const siret = param("profil_siret", "");

  const tva = Math.round((devis.montantTTC - devis.montantHT) * 100) / 100;
  const tauxTvaParam = param("tarif_tva", "0");
  const tauxTva = parseFloat(tauxTvaParam);
  const isFranchiseTva = tauxTva === 0;
  const statuts: Record<string, string> = {
    BROUILLON: "Brouillon",
    ENVOYE: "Envoyé",
    ACCEPTE: "Accepté",
    REFUSE: "Refusé",
    EXPIRE: "Expiré",
  };

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
        .doc-label { font-size: 28px; font-weight: 800; color: #5b21b6; letter-spacing: 2px; text-transform: uppercase; }
        .doc-ref { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
        .doc-meta { font-size: 12px; color: #666; margin-top: 4px; line-height: 1.6; }
        .status-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          background: #ede9fe;
          color: #5b21b6;
          margin-top: 6px;
        }
        .divider { height: 2px; background: linear-gradient(90deg, #5b21b6, #818cf8); border-radius: 2px; margin: 24px 0; }
        .thin-divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
        .client-section { background: #f8f7ff; border-left: 3px solid #5b21b6; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }
        .client-section h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7c3aed; margin-bottom: 8px; }
        .client-section strong { font-size: 15px; font-weight: 700; color: #1a1a1a; display: block; }
        .client-section p { font-size: 12px; color: #555; margin-top: 2px; }
        .prestation-section { margin-bottom: 28px; }
        .prestation-section h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; }
        .prestation-row { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 14px; background: #f9fafb; border-radius: 6px; }
        .prestation-row span:first-child { font-weight: 600; color: #1a1a1a; flex: 1; }
        .totals { margin-left: auto; width: 280px; margin-bottom: 24px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #555; }
        .total-row.ht { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 4px; }
        .total-row.ttc { font-size: 17px; font-weight: 700; color: #1a1a1a; padding-top: 8px; }
        .total-row.ttc span:last-child { color: #5b21b6; }
        .notes-section { background: #f9fafb; padding: 14px; border-radius: 8px; margin-bottom: 28px; }
        .notes-section h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
        .notes-section p { font-size: 12px; color: #555; line-height: 1.6; }
        .conditions { font-size: 11px; color: #888; line-height: 1.7; margin-bottom: 32px; }
        .signature-block { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-box { width: 45%; }
        .sig-box p { font-size: 11px; color: #888; margin-bottom: 6px; }
        .sig-line { height: 1px; background: #ccc; margin-top: 48px; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #bbb; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        @media print {
          body { padding: 20px; }
          @page { margin: 20mm; size: A4; }
        }
        .print-btn {
          position: fixed;
          top: 20px; right: 20px;
          background: #5b21b6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(91,33,182,0.4);
        }
        .print-btn:hover { background: #7c3aed; }
        @media print { .print-btn { display: none; } }
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
          <div className="doc-label">Devis</div>
          <div className="doc-ref">{devis.reference}</div>
          <div className="doc-meta">
            Émis le {fmtDate(devis.dateCreation)}<br />
            Valide jusqu&apos;au {fmtDate(devis.dateExpiration)}<br />
            Validité : {devis.validiteJours} jours
          </div>
          <div className="status-badge">{statuts[devis.statut] ?? devis.statut}</div>
        </div>
      </div>

      <div className="divider" />

      {/* Client */}
      <div className="client-section">
        <h2>Destinataire</h2>
        <strong>{devis.prospect.nom}</strong>
        <p>{devis.prospect.activite}</p>
        {devis.prospect.adresse && <p>{devis.prospect.adresse}</p>}
        {!devis.prospect.adresse && <p>{devis.prospect.ville}</p>}
        {devis.prospect.telephone && <p>Tél : {devis.prospect.telephone}</p>}
        {devis.prospect.email && <p>{devis.prospect.email}</p>}
      </div>

      {/* Prestation */}
      <div className="prestation-section">
        <h2>Prestation</h2>
        <div className="prestation-row">
          <span>{devis.offre}</span>
          <span style={{ fontWeight: 700, color: "#1a1a1a", marginLeft: 24 }}>
            {fmt(devis.montantHT)} €
          </span>
        </div>
      </div>

      {/* Totaux */}
      <div className="totals">
        <div className="total-row ht">
          <span>Montant HT</span>
          <span>{fmt(devis.montantHT)} €</span>
        </div>
        {isFranchiseTva ? (
          <div className="total-row">
            <span style={{ fontStyle: "italic", color: "#888" }}>
              TVA non applicable — art. 293 B du CGI
            </span>
            <span>—</span>
          </div>
        ) : (
          <div className="total-row">
            <span>TVA ({tauxTva} %)</span>
            <span>{fmt(tva)} €</span>
          </div>
        )}
        <div className="total-row ttc">
          <span>Total {isFranchiseTva ? "HT" : "TTC"}</span>
          <span>{fmt(devis.montantTTC)} €</span>
        </div>
      </div>

      <div className="thin-divider" />

      {/* Notes */}
      {devis.notes && (
        <div className="notes-section">
          <h2>Notes</h2>
          <p>{devis.notes}</p>
        </div>
      )}

      {/* Conditions */}
      <div className="conditions">
        <strong style={{ color: "#555" }}>Conditions de règlement :</strong><br />
        Acompte de 50 % à la commande · Solde à la livraison.<br />
        Ce devis est valable {devis.validiteJours} jours à compter de sa date d&apos;émission.<br />
        En cas d&apos;acceptation, veuillez retourner ce document signé avec la mention &ldquo;Bon pour accord&rdquo;.
      </div>

      {/* Signatures */}
      <div className="signature-block">
        <div className="sig-box">
          <p>Prestataire — {nom}</p>
          <div className="sig-line" />
          <p style={{ marginTop: 6 }}>Date : _______________</p>
        </div>
        <div className="sig-box" style={{ textAlign: "right" }}>
          <p>Client — Bon pour accord</p>
          <div className="sig-line" />
          <p style={{ marginTop: 6 }}>Date : _______________</p>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        {nom} — {adresse} — {tel} — {email}
        {siret && ` — SIRET : ${siret}`}
      </div>
    </>
  );
}
