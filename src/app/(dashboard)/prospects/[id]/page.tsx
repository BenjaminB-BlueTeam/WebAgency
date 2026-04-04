import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { ProspectDetail } from "@/components/prospects/prospect-detail"

async function getProspect(id: string) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const cookieHeader = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/prospects/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  })

  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? null
}

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prospect = await getProspect(id)

  if (!prospect) {
    notFound()
  }

  return <ProspectDetail prospect={prospect} />
}
