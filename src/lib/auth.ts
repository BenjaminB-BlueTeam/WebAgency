import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const SESSION_SECRET = process.env.CRM_SESSION_SECRET!
const COOKIE_NAME = "crm_session"

interface TokenPayload {
  user: "admin"
  iat: number
  exp: number
}

export function signToken(): string {
  return jwt.sign({ user: "admin" }, SESSION_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.CRM_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token || !verifyToken(token)) {
    throw new Error("Unauthorized")
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
}
