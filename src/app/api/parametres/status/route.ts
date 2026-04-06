import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

const SERVICES = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Analyse IA, scoring, génération de prompts et de sites",
    url: "https://console.anthropic.com",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "google_places",
    name: "Google Places",
    description: "Recherche d'entreprises locales",
    url: "https://console.cloud.google.com",
    envKey: "GOOGLE_PLACES_KEY",
  },
  {
    id: "google_pagespeed",
    name: "Google PageSpeed",
    description: "Audit technique SEO des sites",
    url: "https://console.cloud.google.com",
    envKey: "GOOGLE_PLACES_KEY",
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    description: "Scraping de sites web",
    url: "https://firecrawl.dev/dashboard",
    envKey: "FIRECRAWL_API_KEY",
  },
  {
    id: "pexels",
    name: "Pexels",
    description: "Images et vidéos stock pour les sites générés",
    url: "https://www.pexels.com/api/key",
    envKey: "PEXELS_API_KEY",
  },
  {
    id: "pappers",
    name: "Pappers",
    description: "Données légales des entreprises françaises",
    url: "https://www.pappers.fr/api",
    envKey: "PAPPERS_API_KEY",
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Déploiement des sites de démo",
    url: "https://app.netlify.com",
    envKey: "NETLIFY_TOKEN",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Envoi d'emails de prospection",
    url: "https://resend.com/domains",
    envKey: "RESEND_API_KEY",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Paiements récurrents maintenance (Phase 2)",
    url: "https://dashboard.stripe.com",
    envKey: "STRIPE_SECRET_KEY",
  },
  {
    id: "plausible",
    name: "Plausible",
    description: "Analytics des sites clients (Phase 2)",
    url: null,
    envKey: "PLAUSIBLE_API_KEY",
  },
] as const

export async function GET() {
  try {
    await requireAuth()

    const data = SERVICES.map((s) => ({
      ...s,
      configured: Boolean(process.env[s.envKey]),
    }))

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
