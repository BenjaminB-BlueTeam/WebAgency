export const OFFRE_TYPE_VALUES = ["VITRINE", "VISIBILITE"] as const
export type OffreType = (typeof OFFRE_TYPE_VALUES)[number]

export function isValidOffreType(value: unknown): value is OffreType {
  return (
    typeof value === "string" &&
    (OFFRE_TYPE_VALUES as readonly string[]).includes(value)
  )
}

export function isValidUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 500) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export interface ClientCreateData {
  prospectId: string
  siteUrl: string
  offreType: OffreType
  dateLivraison: Date
  maintenanceActive?: boolean
}

export interface ClientCreateErrors {
  prospectId?: string
  siteUrl?: string
  offreType?: string
  dateLivraison?: string
  maintenanceActive?: string
}

export function validateClientCreate(body: Record<string, unknown>): {
  data: ClientCreateData | null
  errors: ClientCreateErrors
} {
  const errors: ClientCreateErrors = {}

  const prospectId = validateString(body.prospectId, 100)
  if (!prospectId) errors.prospectId = "prospectId est requis"

  if (!isValidUrl(body.siteUrl)) {
    errors.siteUrl = "siteUrl doit être une URL http(s) valide"
  }

  if (!isValidOffreType(body.offreType)) {
    errors.offreType = "offreType doit être VITRINE ou VISIBILITE"
  }

  if (!isValidISODate(body.dateLivraison)) {
    errors.dateLivraison = "dateLivraison doit être une date valide"
  }

  if (
    body.maintenanceActive !== undefined &&
    typeof body.maintenanceActive !== "boolean"
  ) {
    errors.maintenanceActive = "maintenanceActive doit être un booléen"
  }

  if (Object.keys(errors).length > 0) {
    return { data: null, errors }
  }

  const data: ClientCreateData = {
    prospectId: prospectId!,
    siteUrl: (body.siteUrl as string).trim(),
    offreType: body.offreType as OffreType,
    dateLivraison: new Date(body.dateLivraison as string),
  }
  if (typeof body.maintenanceActive === "boolean") {
    data.maintenanceActive = body.maintenanceActive
  }

  return { data, errors: {} }
}

export interface ClientUpdateData {
  siteUrl?: string
  offreType?: OffreType
  maintenanceActive?: boolean
}

export interface ClientUpdateErrors {
  siteUrl?: string
  offreType?: string
  maintenanceActive?: string
  _general?: string
}

export function validateClientUpdate(body: Record<string, unknown>): {
  data: ClientUpdateData | null
  errors: ClientUpdateErrors
} {
  const errors: ClientUpdateErrors = {}
  const data: ClientUpdateData = {}
  let hasField = false

  if ("siteUrl" in body) {
    if (!isValidUrl(body.siteUrl)) {
      errors.siteUrl = "siteUrl doit être une URL http(s) valide"
    } else {
      data.siteUrl = (body.siteUrl as string).trim()
      hasField = true
    }
  }

  if ("offreType" in body) {
    if (!isValidOffreType(body.offreType)) {
      errors.offreType = "offreType doit être VITRINE ou VISIBILITE"
    } else {
      data.offreType = body.offreType as OffreType
      hasField = true
    }
  }

  if ("maintenanceActive" in body) {
    if (typeof body.maintenanceActive !== "boolean") {
      errors.maintenanceActive = "maintenanceActive doit être un booléen"
    } else {
      data.maintenanceActive = body.maintenanceActive
      hasField = true
    }
  }

  if (Object.keys(errors).length > 0) {
    return { data: null, errors }
  }
  if (!hasField) {
    return { data: null, errors: { _general: "Aucun champ valide à modifier" } }
  }
  return { data, errors: {} }
}

export const STATUT_PIPELINE_VALUES = [
  "A_DEMARCHER",
  "MAQUETTE_EMAIL_ENVOYES",
  "REPONDU",
  "RDV_PLANIFIE",
  "NEGOCIATION",
  "CLIENT",
  "PERDU",
] as const;

export type StatutPipeline = (typeof STATUT_PIPELINE_VALUES)[number];

export function isValidStatutPipeline(value: unknown): value is StatutPipeline {
  return (
    typeof value === "string" &&
    (STATUT_PIPELINE_VALUES as readonly string[]).includes(value)
  );
}

export function isValidEmail(value: unknown): boolean {
  return (
    typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export function isValidISODate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function validateString(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

export function validateOptionalString(
  value: unknown,
  maxLength: number
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

export const PROSPECT_CREATE_FIELDS = [
  "nom",
  "activite",
  "ville",
  "adresse",
  "telephone",
  "email",
  "siteUrl",
] as const;

export const PROSPECT_UPDATE_FIELDS = [
  ...PROSPECT_CREATE_FIELDS,
  "placeId",
  "noteGoogle",
  "nbAvisGoogle",
  "statutPipeline",
  "dateContact",
  "dateRdv",
  "dateMaquetteEnvoi",
  "dateSignature",
  "raisonPerte",
  "derniereRelance",
  "prochaineRelance",
] as const;

export interface ProspectCreateErrors {
  nom?: string;
  activite?: string;
  ville?: string;
  email?: string;
  telephone?: string;
  siteUrl?: string;
  adresse?: string;
}

export interface ProspectCreateData {
  nom: string;
  activite: string;
  ville: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteUrl?: string;
}

export function validateProspectCreate(body: Record<string, unknown>): {
  data: ProspectCreateData | null;
  errors: ProspectCreateErrors;
} {
  const errors: ProspectCreateErrors = {};

  const nom = validateString(body.nom, 100);
  if (!nom) errors.nom = "Le nom est requis (max 100 caractères)";

  if (Object.keys(errors).length > 0) {
    return { data: null, errors };
  }

  const activite = validateOptionalString(body.activite, 100) ?? "";
  const ville = validateOptionalString(body.ville, 100) ?? "";

  const data: ProspectCreateData = {
    nom: nom!,
    activite,
    ville,
  };

  if (body.adresse !== undefined) {
    const adresse = validateOptionalString(body.adresse, 200);
    if (adresse === null && body.adresse !== null) {
      errors.adresse = "L'adresse est invalide (max 200 caractères)";
    } else if (adresse !== undefined) {
      data.adresse = adresse ?? undefined;
    }
  }

  if (body.telephone !== undefined) {
    const telephone = validateOptionalString(body.telephone, 20);
    if (telephone === null && body.telephone !== null) {
      errors.telephone = "Le téléphone est invalide (max 20 caractères)";
    } else if (telephone !== undefined) {
      data.telephone = telephone ?? undefined;
    }
  }

  if (body.email !== undefined && body.email !== null && body.email !== "") {
    if (!isValidEmail(body.email)) {
      errors.email = "L'email est invalide";
    } else {
      data.email = body.email as string;
    }
  }

  if (body.siteUrl !== undefined) {
    const siteUrl = validateOptionalString(body.siteUrl, 500);
    if (siteUrl === null && body.siteUrl !== null) {
      errors.siteUrl = "L'URL du site est invalide (max 500 caractères)";
    } else if (siteUrl !== undefined) {
      data.siteUrl = siteUrl ?? undefined;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { data: null, errors };
  }

  return { data, errors: {} };
}

export interface ProspectUpdateData {
  nom?: string;
  activite?: string;
  ville?: string;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  siteUrl?: string | null;
  placeId?: string | null;
  noteGoogle?: number | null;
  nbAvisGoogle?: number | null;
  statutPipeline?: StatutPipeline;
  dateContact?: Date | null;
  dateRdv?: Date | null;
  dateMaquetteEnvoi?: Date | null;
  dateSignature?: Date | null;
  raisonPerte?: string | null;
  derniereRelance?: Date | null;
  prochaineRelance?: Date | null;
}

export interface ProspectUpdateErrors {
  nom?: string;
  activite?: string;
  ville?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteUrl?: string;
  placeId?: string;
  noteGoogle?: string;
  nbAvisGoogle?: string;
  statutPipeline?: string;
  dateContact?: string;
  dateRdv?: string;
  dateMaquetteEnvoi?: string;
  dateSignature?: string;
  raisonPerte?: string;
  derniereRelance?: string;
  prochaineRelance?: string;
  _general?: string;
}

const DATE_FIELDS = [
  "dateContact",
  "dateRdv",
  "dateMaquetteEnvoi",
  "dateSignature",
  "derniereRelance",
  "prochaineRelance",
] as const;

type DateField = (typeof DATE_FIELDS)[number];

function isDateField(field: string): field is DateField {
  return (DATE_FIELDS as readonly string[]).includes(field);
}

export function validateProspectUpdate(body: Record<string, unknown>): {
  data: ProspectUpdateData | null;
  errors: ProspectUpdateErrors;
} {
  const errors: ProspectUpdateErrors = {};
  const data: ProspectUpdateData = {};
  let hasValidField = false;

  for (const field of PROSPECT_UPDATE_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];

    switch (field) {
      case "nom":
      case "activite":
      case "ville": {
        const result = validateString(value, 100);
        if (result === null) {
          errors[field] = `Le champ "${field}" est invalide (max 100 caractères)`;
        } else {
          data[field] = result;
          hasValidField = true;
        }
        break;
      }

      case "adresse": {
        const result = validateOptionalString(value, 200);
        if (result === null && value !== null) {
          errors.adresse = "L'adresse est invalide (max 200 caractères)";
        } else {
          data.adresse = result ?? null;
          hasValidField = true;
        }
        break;
      }

      case "telephone": {
        const result = validateOptionalString(value, 20);
        if (result === null && value !== null) {
          errors.telephone = "Le téléphone est invalide (max 20 caractères)";
        } else {
          data.telephone = result ?? null;
          hasValidField = true;
        }
        break;
      }

      case "email": {
        if (value === null) {
          data.email = null;
          hasValidField = true;
        } else if (!isValidEmail(value)) {
          errors.email = "L'email est invalide";
        } else {
          data.email = value as string;
          hasValidField = true;
        }
        break;
      }

      case "siteUrl": {
        const result = validateOptionalString(value, 500);
        if (result === null && value !== null) {
          errors.siteUrl = "L'URL du site est invalide (max 500 caractères)";
        } else {
          data.siteUrl = result ?? null;
          hasValidField = true;
        }
        break;
      }

      case "placeId": {
        const result = validateOptionalString(value, 200);
        if (result === null && value !== null) {
          errors.placeId = "Le placeId est invalide (max 200 caractères)";
        } else {
          data.placeId = result ?? null;
          hasValidField = true;
        }
        break;
      }

      case "raisonPerte": {
        const result = validateOptionalString(value, 500);
        if (result === null && value !== null) {
          errors.raisonPerte =
            "La raison de perte est invalide (max 500 caractères)";
        } else {
          data.raisonPerte = result ?? null;
          hasValidField = true;
        }
        break;
      }

      case "noteGoogle": {
        if (value === null) {
          data.noteGoogle = null;
          hasValidField = true;
        } else {
          const num = Number(value);
          if (isNaN(num)) {
            errors.noteGoogle = "La note Google doit être un nombre";
          } else {
            data.noteGoogle = num;
            hasValidField = true;
          }
        }
        break;
      }

      case "nbAvisGoogle": {
        if (value === null) {
          data.nbAvisGoogle = null;
          hasValidField = true;
        } else {
          const num = Number(value);
          if (isNaN(num) || !Number.isInteger(num)) {
            errors.nbAvisGoogle =
              "Le nombre d'avis Google doit être un entier";
          } else {
            data.nbAvisGoogle = num;
            hasValidField = true;
          }
        }
        break;
      }

      case "statutPipeline": {
        if (!isValidStatutPipeline(value)) {
          errors.statutPipeline = "Le statut pipeline est invalide";
        } else {
          data.statutPipeline = value;
          hasValidField = true;
        }
        break;
      }

      default: {
        if (isDateField(field)) {
          if (value === null) {
            data[field] = null;
            hasValidField = true;
          } else if (!isValidISODate(value)) {
            errors[field] = `Le champ "${field}" doit être une date ISO valide`;
          } else {
            data[field] = new Date(value as string);
            hasValidField = true;
          }
        }
        break;
      }
    }
  }

  if (!hasValidField && Object.keys(errors).length === 0) {
    return {
      data: null,
      errors: { _general: "Aucun champ valide à modifier" },
    };
  }

  if (Object.keys(errors).length > 0) {
    return { data: null, errors };
  }

  return { data, errors: {} };
}
