import { cn } from "@/lib/utils";
import type { JobSteps, StepStatus } from "@/lib/prospection-jobs";

const STEPS: { key: keyof JobSteps; label: string }[] = [
  { key: "recherche", label: "Recherche" },
  { key: "concurrents", label: "Concurrents" },
  { key: "maquettes", label: "Maquettes" },
  { key: "deploiement", label: "Déploiement" },
  { key: "crm", label: "CRM" },
];

interface ProspectionProgressProps {
  steps: JobSteps;
  jobStatus: "running" | "done" | "error";
}

export function ProspectionProgress({ steps, jobStatus }: ProspectionProgressProps) {
  const allDone = jobStatus === "done";

  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {STEPS.map((step, i) => {
          const status = steps[step.key];
          return (
            <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
              <StepIcon status={status} />
              <span
                className={cn(
                  "text-[0.65rem] whitespace-nowrap font-medium",
                  status === "done" ? "text-green-400" :
                  status === "running" ? "text-violet-300" :
                  status === "error" ? "text-red-400" :
                  "text-white/30"
                )}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px min-w-[8px]",
                    status === "done" ? "bg-green-400/30" : "bg-white/8"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <span className="shrink-0 text-[0.65rem] text-green-400 bg-green-400/10 border border-green-400/20 rounded px-2 py-0.5 font-medium">
          Terminé ✓
        </span>
      )}
      {jobStatus === "running" && (
        <span className="shrink-0 text-[0.65rem] text-violet-300 animate-pulse">
          En cours…
        </span>
      )}
      {jobStatus === "error" && (
        <span className="shrink-0 text-[0.65rem] text-red-400">
          Erreur
        </span>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return <span className="text-green-400 text-sm leading-none">✓</span>;
  }
  if (status === "running") {
    return (
      <span className="text-violet-300 text-sm leading-none animate-spin inline-block">
        ⟳
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-red-400 text-sm leading-none">✗</span>;
  }
  return <span className="text-white/20 text-sm leading-none">○</span>;
}
