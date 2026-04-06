import { prisma } from "@/lib/db"

/**
 * Returns the stored value for `cle`, or `defaultValue` if missing.
 * Never throws — on DB error, falls back to defaultValue.
 */
export async function getParam(cle: string, defaultValue: string): Promise<string> {
  try {
    const row = await prisma.parametre.findUnique({ where: { cle } })
    return row ? row.valeur : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Creates or updates `cle` with `valeur`.
 */
export async function setParam(cle: string, valeur: string): Promise<void> {
  await prisma.parametre.upsert({
    where: { cle },
    update: { valeur },
    create: { cle, valeur },
  })
}
