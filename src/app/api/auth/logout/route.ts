import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/auth"

export async function POST() {
  const response = NextResponse.json({ data: { success: true } })
  clearSessionCookie(response)
  return response
}
