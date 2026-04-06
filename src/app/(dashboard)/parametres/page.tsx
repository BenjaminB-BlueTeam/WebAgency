import { getParam } from "@/lib/params"
import { ParametresTabs } from "@/components/parametres/parametres-tabs"

export default async function ParametresPage() {
  const [
    agenceNom,
    agenceContact,
    agenceEmail,
    agenceTelephone,
    agenceAdresse,
    scoringPresenceWeb,
    scoringSEO,
    scoringDesign,
    scoringFinancier,
    scoringPotentiel,
    relanceEmail,
    relanceMaquette,
    relanceRdv,
    relanceDevis,
    prospectionVilles,
    prospectionRayon,
    offreVitrinePrix,
    offreVitrineDescription,
    offreVisibilitePrix,
    offreVisibiliteMaintenance,
    offreVisibiliteDescription,
    emailProspectionPrompt,
    emailRelancePrompt,
  ] = await Promise.all([
    getParam("agence.nom", ""),
    getParam("agence.contact", ""),
    getParam("agence.email", ""),
    getParam("agence.telephone", ""),
    getParam("agence.adresse", ""),
    getParam("scoring.poids.presenceWeb", "3"),
    getParam("scoring.poids.seo", "2"),
    getParam("scoring.poids.design", "2"),
    getParam("scoring.poids.financier", "1"),
    getParam("scoring.poids.potentiel", "3"),
    getParam("relance.delai.email", "7"),
    getParam("relance.delai.maquette", "5"),
    getParam("relance.delai.rdv", "3"),
    getParam("relance.delai.devis", "10"),
    getParam("prospection.villes", "[]"),
    getParam("prospection.rayonKm", "10"),
    getParam("offre.vitrine.prix", ""),
    getParam("offre.vitrine.description", ""),
    getParam("offre.visibilite.prix", ""),
    getParam("offre.visibilite.maintenance", ""),
    getParam("offre.visibilite.description", ""),
    getParam(
      "email.prospection.systemPrompt",
      "Tu es un expert en prospection commerciale pour une agence web locale. Rédige un email de prospection personnalisé, professionnel et concis."
    ),
    getParam(
      "email.relance.systemPrompt",
      "Tu es un expert en relance commerciale pour une agence web locale. Rédige un email de relance chaleureux et persuasif."
    ),
  ])

  let villesArray: string[] = []
  try {
    villesArray = JSON.parse(prospectionVilles) as string[]
    if (!Array.isArray(villesArray)) villesArray = []
  } catch {
    villesArray = []
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Paramètres</h1>

      <ParametresTabs
        profil={{
          nom: agenceNom,
          contact: agenceContact,
          email: agenceEmail,
          telephone: agenceTelephone,
          adresse: agenceAdresse,
        }}
        scoring={{
          presenceWeb: parseFloat(scoringPresenceWeb),
          seo: parseFloat(scoringSEO),
          design: parseFloat(scoringDesign),
          financier: parseFloat(scoringFinancier),
          potentiel: parseFloat(scoringPotentiel),
        }}
        relances={{
          email: parseInt(relanceEmail, 10),
          maquette: parseInt(relanceMaquette, 10),
          rdv: parseInt(relanceRdv, 10),
          devis: parseInt(relanceDevis, 10),
        }}
        zone={{
          villes: villesArray,
          rayonKm: parseInt(prospectionRayon, 10),
        }}
        offres={{
          vitrine: {
            prix: offreVitrinePrix,
            description: offreVitrineDescription,
          },
          visibilite: {
            prix: offreVisibilitePrix,
            maintenance: offreVisibiliteMaintenance,
            description: offreVisibiliteDescription,
          },
        }}
        emails={{
          prospection: emailProspectionPrompt,
          relance: emailRelancePrompt,
        }}
      />
    </div>
  )
}
