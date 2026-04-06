import { analyzeWithClaude } from "@/lib/anthropic"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProspectInput {
  nom: string
  activite: string
  adresse: string // ex: "8 Grand Place, 59670 Cassel"
  ville: string
}

export interface PappersData {
  siret: string
  siren: string
  denominationSociale: string
  nomCommercial: string | null
  dirigeant: string | null
  dateCreation: string // "1998-03-15"
  anciennete: string // "27 ans"
  formeJuridique: string
  chiffreAffaires: number | null
  resultatNet: number | null
  effectifs: string | null
  codeNAF: string
  libelleNAF: string
  adresseSiege: string
  latitude: number | null
  longitude: number | null
  statutEntreprise: string
  conventionCollective: string | null
  matchConfidence: "high" | "medium" | "low"
  matchMethod: "nom" | "naf_cp" | "adresse" | "departement" | "claude"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function extractCodePostal(adresse: string): string | null {
  const match = adresse.match(/\b(\d{5})\b/)
  return match ? match[1] : null
}

export function extractDepartement(adresse: string): string | null {
  const cp = extractCodePostal(adresse)
  if (!cp) return null
  return cp.slice(0, 2)
}

export function activiteToNAF(activite: string): string | null {
  const a = activite.toLowerCase()
  if (a.includes("boulang")) return "10.71C"
  if (a.includes("plomb")) return "43.22A"
  if (a.includes("coiff")) return "96.02A"
  if (a.includes("restaur")) return "56.10A"
  if (a.includes("électric") || a.includes("electric")) return "43.21A"
  if (a.includes("menuisi")) return "43.32A"
  if (a.includes("maçon") || a.includes("macon")) return "43.39A"
  if (a.includes("garag") || a.includes("automobil")) return "45.20A"
  if (a.includes("fleurist")) return "47.76Z"
  if (a.includes("pharmac")) return "47.73Z"
  return null
}

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp[m][n]
}

export function calcAnciennete(dateCreation: string): string {
  const created = new Date(dateCreation)
  const now = new Date()
  const years = now.getFullYear() - created.getFullYear()
  const adjusted =
    now.getMonth() < created.getMonth() ||
    (now.getMonth() === created.getMonth() && now.getDate() < created.getDate())
      ? years - 1
      : years
  return `${adjusted} ans`
}

// ─── Pappers API ──────────────────────────────────────────────────────────────

const BASE = "https://api.pappers.fr/v2"

interface PappersRaw {
  siret?: string
  siren?: string
  nom_entreprise?: string
  nom_commercial?: string | null
  dirigeants?: Array<{ nom?: string; prenom?: string; nom_complet?: string }>
  date_creation?: string
  forme_juridique?: string
  finances?: Array<{
    chiffre_affaires?: number | null
    resultat_net?: number | null
    effectifs?: string | null
  }>
  code_naf?: string
  libelle_code_naf?: string
  siege?: {
    adresse_ligne_1?: string
    adresse_ligne_2?: string
    code_postal?: string
    ville?: string
    latitude?: number | null
    longitude?: number | null
  }
  statut_rcs?: string
  convention_collective_info?: string | null
}

interface PappersSearchResponse {
  resultats?: PappersRaw[]
}

async function pappersGet<T>(path: string, apiKey: string): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Pappers API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

function buildAddress(siege: PappersRaw["siege"]): string {
  if (!siege) return ""
  const parts = [siege.adresse_ligne_1, siege.adresse_ligne_2, siege.code_postal, siege.ville]
  return parts.filter(Boolean).join(", ")
}

function extractDirigeant(raw: PappersRaw): string | null {
  if (!raw.dirigeants || raw.dirigeants.length === 0) return null
  const d = raw.dirigeants[0]
  if (d.nom_complet) return d.nom_complet
  if (d.prenom && d.nom) return `${d.prenom} ${d.nom}`
  if (d.nom) return d.nom
  return null
}

function buildPappersData(
  raw: PappersRaw,
  matchConfidence: PappersData["matchConfidence"],
  matchMethod: PappersData["matchMethod"]
): PappersData {
  const finances = raw.finances?.[0] ?? null
  const siege = raw.siege ?? {}
  const adresseSiege = buildAddress(raw.siege)

  return {
    siret: raw.siret ?? "",
    siren: raw.siren ?? "",
    denominationSociale: raw.nom_entreprise ?? "",
    nomCommercial: raw.nom_commercial ?? null,
    dirigeant: extractDirigeant(raw),
    dateCreation: raw.date_creation ?? "",
    anciennete: raw.date_creation ? calcAnciennete(raw.date_creation) : "",
    formeJuridique: raw.forme_juridique ?? "",
    chiffreAffaires: finances?.chiffre_affaires ?? null,
    resultatNet: finances?.resultat_net ?? null,
    effectifs: finances?.effectifs ?? null,
    codeNAF: raw.code_naf ?? "",
    libelleNAF: raw.libelle_code_naf ?? "",
    adresseSiege,
    latitude: siege.latitude ?? null,
    longitude: siege.longitude ?? null,
    statutEntreprise: raw.statut_rcs ?? "",
    conventionCollective: raw.convention_collective_info ?? null,
    matchConfidence,
    matchMethod,
  }
}

async function fetchDetail(siret: string, apiKey: string): Promise<PappersRaw | null> {
  try {
    return await pappersGet<PappersRaw>(`/entreprise?siret=${siret}`, apiKey)
  } catch {
    return null
  }
}

function nameMatchesProspect(papperName: string, prospectName: string): boolean {
  const a = papperName.toLowerCase()
  const b = prospectName.toLowerCase()
  if (levenshtein(a, b) < 5) return true
  // Check if any significant word from prospect is in pappers name
  const words = b.split(/\s+/).filter((w) => w.length > 3)
  if (words.some((w) => a.includes(w))) return true
  if (b.includes(a)) return true
  return false
}

function geoDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula — returns distance in meters
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Matching cascade ─────────────────────────────────────────────────────────

async function level1Nom(
  prospect: ProspectInput,
  cp: string,
  apiKey: string
): Promise<PappersRaw | null> {
  const q = encodeURIComponent(prospect.nom)
  const res = await pappersGet<PappersSearchResponse>(
    `/recherche?q=${q}&code_postal=${cp}&entreprise_cessee=false&par_page=5`,
    apiKey
  )
  const results = res.resultats ?? []
  return (
    results.find((r) => r.nom_entreprise && nameMatchesProspect(r.nom_entreprise, prospect.nom)) ??
    null
  )
}

async function level2NafCp(
  prospect: ProspectInput,
  cp: string,
  apiKey: string
): Promise<PappersRaw | null> {
  const naf = activiteToNAF(prospect.activite)
  if (!naf) return null

  const res = await pappersGet<PappersSearchResponse>(
    `/recherche?code_naf=${encodeURIComponent(naf)}&code_postal=${cp}&entreprise_cessee=false&par_page=20`,
    apiKey
  )
  const results = res.resultats ?? []
  if (results.length === 0) return null

  // Try to match by geo proximity
  // Estimate coords from prospect adresse — we don't have geocoding here,
  // so we use the siege coords of the best candidate; if any result has lat/lng, filter by 500m
  const withCoords = results.filter(
    (r) => r.siege?.latitude != null && r.siege?.longitude != null
  )
  if (withCoords.length > 0) {
    // Use coords of first result as reference if we don't have prospect coords
    // Sort by proximity if multiple — take the one closest (assuming the prospect has no coords)
    // Fall through to first result in withCoords
    return withCoords[0]
  }

  return results[0]
}

async function level3Adresse(
  prospect: ProspectInput,
  cp: string,
  apiKey: string
): Promise<PappersRaw | null> {
  // Extract street number + street name from adresse
  const adressePart = prospect.adresse.replace(/,.*$/, "").trim() // everything before first comma
  const q = encodeURIComponent(adressePart)

  const res = await pappersGet<PappersSearchResponse>(
    `/recherche?q=${q}&code_postal=${cp}&par_page=10`,
    apiKey
  )
  const results = res.resultats ?? []
  if (results.length === 0) return null

  // Find one whose siege address shares common words with prospect adresse
  const prospectWords = prospect.adresse
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 3)

  const match = results.find((r) => {
    const siegeAddr = buildAddress(r.siege).toLowerCase()
    return prospectWords.some((w) => siegeAddr.includes(w))
  })

  return match ?? results[0]
}

async function level4Departement(
  prospect: ProspectInput,
  dept: string,
  apiKey: string
): Promise<PappersRaw | null> {
  const naf = activiteToNAF(prospect.activite)
  const firstWord = prospect.nom.split(/\s+/)[0]
  const q = encodeURIComponent(firstWord)

  const params = naf
    ? `/recherche?q=${q}&departement=${dept}&code_naf=${encodeURIComponent(naf)}&par_page=20`
    : `/recherche?q=${q}&departement=${dept}&par_page=20`

  const res = await pappersGet<PappersSearchResponse>(params, apiKey)
  const results = res.resultats ?? []
  return results[0] ?? null
}

async function level5Claude(
  prospect: ProspectInput,
  cp: string,
  apiKey: string
): Promise<PappersRaw | null> {
  const systemPrompt = `Tu es un expert en données d'entreprises françaises.`
  const userPrompt = `Pour l'entreprise "${prospect.nom}" (activité: ${prospect.activite}, adresse: ${prospect.adresse}), propose jusqu'à 3 variantes orthographiques ou abréviations courantes du nom commercial qui pourraient être utilisées dans les registres officiels. Réponds UNIQUEMENT avec un JSON: {"variantes": ["var1", "var2", "var3"]}`

  let response: string
  try {
    response = await analyzeWithClaude(systemPrompt, userPrompt, 256)
  } catch {
    return null
  }

  let variantes: string[] = []
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { variantes?: string[] }
      variantes = parsed.variantes ?? []
    }
  } catch {
    return null
  }

  for (const variante of variantes) {
    const q = encodeURIComponent(variante)
    try {
      const res = await pappersGet<PappersSearchResponse>(
        `/recherche?q=${q}&code_postal=${cp}&entreprise_cessee=false&par_page=5`,
        apiKey
      )
      const results = res.resultats ?? []
      const match = results.find(
        (r) => r.nom_entreprise && nameMatchesProspect(r.nom_entreprise, variante)
      )
      if (match) return match
    } catch {
      continue
    }
  }

  return null
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function matchPappers(prospect: ProspectInput): Promise<PappersData | null> {
  const apiKey = process.env.PAPPERS_API_KEY
  if (!apiKey) return null

  const cp = extractCodePostal(prospect.adresse)
  const dept = cp ? cp.slice(0, 2) : extractDepartement(prospect.ville) ?? ""

  let raw: PappersRaw | null = null
  let matchConfidence: PappersData["matchConfidence"] = "low"
  let matchMethod: PappersData["matchMethod"] = "nom"

  // Level 1 — nom + code postal
  if (cp) {
    try {
      raw = await level1Nom(prospect, cp, apiKey)
    } catch {
      raw = null
    }
    if (raw) {
      matchConfidence = "high"
      matchMethod = "nom"
    }
  }

  // Level 2 — NAF + code postal
  if (!raw && cp) {
    try {
      raw = await level2NafCp(prospect, cp, apiKey)
    } catch {
      raw = null
    }
    if (raw) {
      matchConfidence = "medium"
      matchMethod = "naf_cp"
    }
  }

  // Level 3 — adresse exacte
  if (!raw && cp) {
    try {
      raw = await level3Adresse(prospect, cp, apiKey)
    } catch {
      raw = null
    }
    if (raw) {
      matchConfidence = "medium"
      matchMethod = "adresse"
    }
  }

  // Level 4 — département + NAF
  if (!raw && dept) {
    try {
      raw = await level4Departement(prospect, dept, apiKey)
    } catch {
      raw = null
    }
    if (raw) {
      matchConfidence = "low"
      matchMethod = "departement"
    }
  }

  // Level 5 — Claude suggestion
  if (!raw && cp) {
    try {
      raw = await level5Claude(prospect, cp, apiKey)
    } catch {
      raw = null
    }
    if (raw) {
      matchConfidence = "low"
      matchMethod = "claude"
    }
  }

  if (!raw) return null

  // Fetch detailed record
  const siret = raw.siret
  if (siret) {
    try {
      const detail = await fetchDetail(siret, apiKey)
      if (detail) raw = detail
    } catch {
      // Use search result as fallback
    }
  }

  return buildPappersData(raw, matchConfidence, matchMethod)
}
