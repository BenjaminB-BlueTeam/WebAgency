// src/lib/email.ts
import { Resend } from "resend"
import { analyzeWithClaude, parseClaudeJSON } from "@/lib/anthropic"
import { getParam } from "@/lib/params"
import type { RelanceType } from "@/types/emails"

interface ProspectInput {
  nom: string
  activite: string
  ville: string
  email: string | null
  telephone: string | null
}

interface MaquetteInput {
  demoUrl: string | null
  version: number
}

// Default prompts (keep these as fallback values)
const DEFAULT_PROSPECTION = `Tu rédiges des emails de prospection pour Flandre Web Agency. Ton professionnel mais chaleureux, personnalisé au métier du prospect. Court (max 150 mots). Pas de ton commercial agressif — tu es un voisin qui propose un service utile. Réponds en JSON : {"sujet": string, "corps": string}`
const DEFAULT_RELANCE_MAQUETTE = `Tu rédiges des emails de relance pour Flandre Web Agency. La maquette web du prospect a été envoyée sans retour. Rappelle la démo de manière bienveillante et propose un échange. Court (max 120 mots). Réponds en JSON : {"sujet": string, "corps": string}`
const DEFAULT_RELANCE_RDV = `Tu rédiges un email de suivi post-RDV pour Flandre Web Agency. Le rendez-vous a eu lieu mais il n'y a pas eu de suite. Ton bienveillant, tu proposes de passer à l'étape suivante (devis ou présentation). Court (max 120 mots). Réponds en JSON : {"sujet": string, "corps": string}`
const DEFAULT_RELANCE_DEVIS = `Tu rédiges un email de relance devis pour Flandre Web Agency. Un devis a été envoyé sans réponse depuis plus de 10 jours. Ton professionnel et non intrusif, tu proposes de répondre à d'éventuelles questions. Court (max 120 mots). Réponds en JSON : {"sujet": string, "corps": string}`
const DEFAULT_RELANCE = `Tu rédiges des emails de relance pour Flandre Web Agency. Ton professionnel mais chaleureux. Court (max 120 mots). Tu rappelles que tu avais envoyé une présentation de site web et proposes de discuter. Pas de ton commercial agressif. Réponds en JSON : {"sujet": string, "corps": string}`

export async function generateProspectionEmail(
  prospect: ProspectInput,
  maquette?: MaquetteInput | null,
  analyse?: { recommandations: string } | null,
  isRelance?: boolean,
  relanceType?: RelanceType
): Promise<{ sujet: string; corps: string }> {
  const contextParts: string[] = [
    `activité = ${prospect.activite}`,
    `ville = ${prospect.ville}`,
  ]
  if (maquette?.demoUrl) contextParts.push(`lien démo: ${maquette.demoUrl}`)
  if (analyse) contextParts.push(`recommandations: ${analyse.recommandations}`)

  let promptKey: string
  let defaultPrompt: string
  if (!isRelance) {
    promptKey = "email.prospection.systemPrompt"
    defaultPrompt = DEFAULT_PROSPECTION
  } else if (relanceType === "MAQUETTE") {
    promptKey = "email.relance.maquette.systemPrompt"
    defaultPrompt = DEFAULT_RELANCE_MAQUETTE
  } else if (relanceType === "RDV") {
    promptKey = "email.relance.rdv.systemPrompt"
    defaultPrompt = DEFAULT_RELANCE_RDV
  } else if (relanceType === "DEVIS") {
    promptKey = "email.relance.devis.systemPrompt"
    defaultPrompt = DEFAULT_RELANCE_DEVIS
  } else {
    promptKey = "email.relance.systemPrompt"
    defaultPrompt = DEFAULT_RELANCE
  }

  let systemPrompt = await getParam(promptKey, defaultPrompt)
  // Apply placeholder substitution for user-customized templates
  systemPrompt = systemPrompt
    .replace(/\{\{nom\}\}/g, prospect.nom)
    .replace(/\{\{activite\}\}/g, prospect.activite)
    .replace(/\{\{ville\}\}/g, prospect.ville)

  const response = await analyzeWithClaude(
    systemPrompt,
    `Génère un email de prospection pour ${prospect.nom}, ${contextParts.join(", ")}`
  )
  const parsed = parseClaudeJSON<{ sujet: string; corps: string }>(response)
  return { sujet: parsed.sujet, corps: parsed.corps }
}

export async function buildEmailHtml(
  corps: string,
  prospect: ProspectInput,
  maquetteDemoUrl?: string | null
): Promise<string> {
  const [contact, agenceNom, agenceEmail, agenceTel] = await Promise.all([
    getParam("agence.contact", "Benjamin B."),
    getParam("agence.nom", "Flandre Web Agency"),
    getParam("agence.email", process.env.RESEND_FROM_EMAIL ?? ""),
    getParam("agence.telephone", ""),
  ])

  const demoSection = maquetteDemoUrl
    ? `<tr><td style="padding: 20px 0;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;"><p style="font-size: 14px; color: #555555; margin: 0 0 12px 0; font-family: Arial, sans-serif;">Aperçu de votre futur site web :</p><a href="${maquetteDemoUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">Voir la démo →</a></td></tr></table></td></tr>`
    : ""

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="font-size: 16px; color: #1a1a1a; line-height: 1.7; margin: 0; font-family: Arial, sans-serif; white-space: pre-line;">${corps}</p>
            </td>
          </tr>
          ${demoSection}
          <tr>
            <td style="border-top: 1px solid #e5e5e5; padding-top: 20px;">
              <p style="font-size: 13px; color: #737373; margin: 0; line-height: 1.6; font-family: Arial, sans-serif;">
                <strong style="color: #1a1a1a;">${contact}</strong> — ${agenceNom}<br>
                Création de sites vitrines pour artisans et PME locales en Flandre Intérieure<br>
                ${agenceEmail}${agenceTel ? `<br>${agenceTel}` : ""}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY!)

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Email timeout (15s)")), 15000)
  )

  try {
    const { data, error } = await Promise.race([
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to,
        subject,
        html: htmlContent,
      }),
      timeoutPromise,
    ])

    if (error) {
      console.error("[email] send error:", error.message)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[email] send error:", message)
    return { success: false, error: message }
  }
}
