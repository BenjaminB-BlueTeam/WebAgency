import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth"

// In-memory store (resets on server restart — acceptable for single-user app)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record) return true // no record = OK
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip) // expired window
    return true
  }
  return record.count < MAX_ATTEMPTS
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now })
  } else {
    loginAttempts.set(ip, { count: record.count + 1, firstAttempt: record.firstAttempt })
  }
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

// Export for testing
export { checkRateLimit, recordFailedAttempt, clearAttempts, loginAttempts }

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 15 minutes." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Mot de passe requis" },
        { status: 400 }
      )
    }

    if (password.length > 200) {
      return NextResponse.json(
        { error: "Mot de passe invalide" },
        { status: 400 }
      )
    }

    const valid = await verifyPassword(password)
    if (!valid) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      )
    }

    clearAttempts(ip)
    const token = signToken()
    const response = NextResponse.json({ data: { success: true } })
    setSessionCookie(response, token)
    return response
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
