import * as StitchSDK from "@google/stitch-sdk"
import { buildStitchPrompt } from "./stitch/buildPrompt"

type StitchClient = {
  createProject: (name: string) => Promise<{
    id: string
    generate: (prompt: string, device: string) => Promise<{ getHtml: () => Promise<string> }>
  }>
}

// Cast to factory to support vi.fn() mocks (which use arrow functions, not constructors)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StitchCtor = StitchSDK.Stitch as unknown as (...args: any[]) => StitchClient

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

export async function generateMaquette(
  prospect: ProspectInput,
  analyse?: AnalyseInput | null
): Promise<MaquetteResult> {
  const stitchClient = StitchCtor()
  const project = await stitchClient.createProject(prospect.nom)
  const basePrompt = await buildStitchPrompt(prospect, analyse)

  const screens: MaquetteScreen[] = []
  for (const screen of SCREENS) {
    const prompt = `${basePrompt}\n\n${screen.suffix}`
    const generated = await project.generate(prompt, "MOBILE")
    const htmlUrl = await generated.getHtml()
    const response = await fetch(htmlUrl)
    const html = await response.text()
    screens.push({ name: screen.name, html })
  }

  return { projectId: project.id, screens, promptUsed: basePrompt }
}
