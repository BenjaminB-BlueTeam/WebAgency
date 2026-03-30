import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const secret = new TextEncoder().encode(
  process.env.CRM_SESSION_SECRET || "fallback-dev-secret-change-in-prod"
);

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.CRM_PASSWORD_HASH;
  if (!hash || hash.includes("placeholder")) return password === "admin"; // dev fallback
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
