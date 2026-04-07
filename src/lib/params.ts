import { prisma } from "@/lib/db"

const CACHE_TTL_MS = 60_000

interface CacheEntry {
  value: string
  expiresAt: number
}

const paramCache = new Map<string, CacheEntry>()

/**
 * Returns the stored value for `cle`, or `defaultValue` if missing.
 * Results are cached in memory for 60 seconds.
 * Never throws — on DB error, falls back to defaultValue.
 */
export async function getParam(cle: string, defaultValue: string): Promise<string> {
  const cached = paramCache.get(cle)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  try {
    const row = await prisma.parametre.findUnique({ where: { cle } })
    const value = row ? row.valeur : defaultValue
    paramCache.set(cle, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  } catch {
    return defaultValue
  }
}

/**
 * Creates or updates `cle` with `valeur`.
 * Invalidates the cache entry for `cle`.
 */
export async function setParam(cle: string, valeur: string): Promise<void> {
  paramCache.delete(cle)
  await prisma.parametre.upsert({
    where: { cle },
    update: { valeur },
    create: { cle, valeur },
  })
}

// Only for testing — clears the in-memory cache
export function _clearParamCacheForTesting(): void {
  paramCache.clear()
}
