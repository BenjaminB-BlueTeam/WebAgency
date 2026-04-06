import { getDashboardStats, getDashboardRelances, getDashboardActivites } from "@/lib/dashboard"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { PipelineBar } from "@/components/dashboard/pipeline-bar"
import { RelancesWidget } from "@/components/dashboard/relances-widget"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { VeilleWidget } from "@/components/dashboard/veille-widget"

async function loadDashboardData() {
  const [stats, relances, activites] = await Promise.all([
    getDashboardStats().catch(() => null),
    getDashboardRelances().catch(() => ({ count: 0, prospects: [] })),
    getDashboardActivites().catch(() => []),
  ])
  return { stats, relances, activites }
}

export default async function DashboardPage() {
  const { stats, relances, activites } = await loadDashboardData()

  return (
    <div>
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Dashboard</h1>

      {stats === null ? (
        <p className="text-sm text-[#f87171]">Erreur lors du chargement des statistiques</p>
      ) : (
        <>
          {/* Stats */}
          <StatsGrid stats={stats} />

          {/* Pipeline + Relances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <PipelineBar pipeline={stats.pipeline} />
            <RelancesWidget relances={relances} />
          </div>

          {/* Veille nouveaux prospects */}
          <div className="mt-4">
            <VeilleWidget />
          </div>

          {/* Timeline */}
          <div className="mt-4">
            <ActivityTimeline activites={activites} />
          </div>
        </>
      )}
    </div>
  )
}
