import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      )
    }

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
