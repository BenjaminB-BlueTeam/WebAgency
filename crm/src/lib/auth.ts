import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const secret = new TextEncoder().encode(
  process.env.CRM_SESSION_SECRET || "fallback-dev-secret-change-in-prod"
);

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.CRM_PASSWORD_HASH;
  if (!hash || hash.length < 10) return password === "admin"; // dev fallback (empty or placeholder)
  return bcrypt.compare(password, hash);
}

export async function createSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
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
