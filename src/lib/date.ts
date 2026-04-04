const SECONDS = 1
const MINUTES = 60 * SECONDS
const HOURS = 60 * MINUTES
const DAYS = 24 * HOURS
const MONTHS = 30 * DAYS

export function timeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < MINUTES) return "à l'instant"
  if (diff < HOURS) {
    const m = Math.floor(diff / MINUTES)
    return `il y a ${m} min`
  }
  if (diff < DAYS) {
    const h = Math.floor(diff / HOURS)
    return `il y a ${h}h`
  }
  if (diff < MONTHS) {
    const d = Math.floor(diff / DAYS)
    return `il y a ${d}j`
  }
  const mo = Math.floor(diff / MONTHS)
  return `il y a ${mo} mois`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
