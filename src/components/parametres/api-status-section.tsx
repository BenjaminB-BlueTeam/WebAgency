"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Check, X } from "lucide-react"

type ServiceStatus = {
  id: string
  name: string
  description: string
  url: string | null
  envKey: string
  configured: boolean
}

function SkeletonRow() {
  return (
    <tr>
      <td colSpan={4} className="py-2 px-4">
        <div className="h-8 rounded-[6px] bg-[#0a0a0a] animate-pulse" />
      </td>
    </tr>
  )
}

export function ApiStatusSection() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch("/api/parametres/status")
      .then((r) => r.json())
      .then((json: { data: ServiceStatus[] }) => {
        setServices(json.data)
        setLoading(false)
      })
  }, [])

  const configured = services.filter((s) => s.configured).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#fafafa]">Outils &amp; APIs</h2>
        {!loading && (
          <span className="text-xs text-[#737373]">
            {configured}/{services.length} configurées
          </span>
        )}
      </div>

      <div className="border border-[#1a1a1a] rounded-[6px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                Service
              </th>
              <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider hidden lg:table-cell">
                Description
              </th>
              <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider hidden sm:table-cell">
                Dashboard
              </th>
              <th className="py-2 px-4 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              : services.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#0a0a0a] transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-[#fafafa]">
                      {service.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#737373] hidden lg:table-cell">
                      {service.description}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {service.url ? (
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#fafafa] transition-colors"
                        >
                          Dashboard
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-xs text-[#555555]">Auto-hébergé</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {service.configured ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#4ade80]">
                          <Check size={12} />
                          Configurée
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs text-[#f87171]">
                            <X size={12} />
                            Manquante
                          </span>
                          <p className="text-[10px] text-[#555555] mt-0.5 font-mono">
                            {service.envKey}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
