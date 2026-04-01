import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

// C-01: Secret JWT sans fallback — variable d'environnement obligatoire
function getJwtSecret(): Uint8Array {
  const JWT_SECRET = process.env.CRM_SESSION_SECRET;
  if (!JWT_SECRET) throw new Error('CRM_SESSION_SECRET manquant — configurer la variable d\'environnement');
  return new TextEncoder().encode(JWT_SECRET);
}

// C-02: Plus de fallback "admin" — CRM_PASSWORD_HASH obligatoire
export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.CRM_PASSWORD_HASH;
  if (!hash || hash.length < 10) return false; // Pas de hash configuré → connexion refusée
  return bcrypt.compare(password, hash);
}

// H-03: Expiration JWT réduite de 30d à 24h
// TODO: implémenter une blacklist de tokens pour la révocation
export async function createSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

/**
 * Call at the top of any protected route handler.
 * Returns null when the request is authenticated,
 * or a 401 NextResponse to return immediately when it is not.
 */
export async function requireAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const token = request.cookies.get("session")?.value;
  if (!token || !(await verifySession(token))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}
