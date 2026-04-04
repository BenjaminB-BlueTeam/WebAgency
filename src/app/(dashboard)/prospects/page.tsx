import { cookies } from "next/headers"
import { ProspectList } from "@/components/prospects/prospect-list"

async function getProspects() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const cookieHeader = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/prospects?sort=createdAt&order=desc`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  })

  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function ProspectsPage() {
  const prospects = await getProspects()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Prospects</h1>
      <ProspectList initialProspects={prospects} />
    </div>
  )
}
