import { Stitch, StitchToolClient } from "@google/stitch-sdk"
import { buildStitchPrompt } from "./stitch/buildPrompt"

const SCREENS = [
  { name: "accueil", suffix: "Page d'accueil avec hero, accroche principale et CTA contact" },
  { name: "services", suffix: "Page listant les prestations et services proposés" },
  { name: "contact", suffix: "Page contact avec formulaire de contact, téléphone et adresse" },
  { name: "a-propos", suffix: "Page à propos présentant l'entreprise, ses valeurs et zone géographique" },
] as const

export type MaquetteScreen = { name: string; html: string }

export type MaquetteResult = {
  projectId: string
  screens: MaquetteScreen[]
  promptUsed: string
}

interface ProspectInput {
  nom: string
  activite: string
  ville: string
  telephone?: string | null
  siteUrl?: string | null
}

interface AnalyseInput {
  recommandations: string
}

// Lazy singleton — created once on first call, reused across subsequent calls
let stitchInstance: Stitch | null = null

function getStitch(): Stitch {
  if (!stitchInstance) {
    // StitchToolClient reads STITCH_API_KEY from env automatically when no apiKey provided
    const toolClient = new StitchToolClient()
    // Cast to constructor form to support vi.fn() mocks in tests (arrow-function implementations)
    const StitchCtor = Stitch as unknown as new (client: StitchToolClient) => Stitch
    stitchInstance = new StitchCtor(toolClient)
  }
  return stitchInstance
}

export async function generateMaquette(
  prospect: ProspectInput,
  analyse?: AnalyseInput | null
): Promise<MaquetteResult> {
  const stitch = getStitch()
  const project = await stitch.createProject(prospect.nom)
  const basePrompt = await buildStitchPrompt(prospect, analyse)

  const screens: MaquetteScreen[] = []
  for (const screen of SCREENS) {
    const prompt = `${basePrompt}\n\n${screen.suffix}`
    const generated = await project.generate(prompt, "MOBILE")
    const htmlUrl = await generated.getHtml()

    if (!htmlUrl) throw new Error(`Stitch returned no download URL for screen "${screen.name}"`)

    const response = await fetch(htmlUrl)

    if (!response.ok) throw new Error(`Failed to fetch HTML for screen "${screen.name}": ${response.status}`)

    const html = await response.text()
    screens.push({ name: screen.name, html })
  }

  return { projectId: project.id, screens, promptUsed: basePrompt }
}
