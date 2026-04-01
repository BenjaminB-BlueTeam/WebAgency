"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProspectsList } from "@/components/prospects/prospects-list";
import { PipelineKanban } from "@/components/prospects/pipeline-kanban";

interface ProspectRow {
  id: string;
  nom: string;
  activite: string;
  ville: string;
  telephone: string | null;
  email: string | null;
  siteUrl: string | null;
  statut: string;
  priorite: string;
  statutPipeline: string;
  dateAjout: string;
  maquettes: { id: string; statut: string; demoUrl: string | null }[];
  _count: { activites: number };
}

interface ProspectsPageTabsProps {
  initialData: ProspectRow[];
}

export function ProspectsPageTabs({ initialData }: ProspectsPageTabsProps) {
  return (
    <Tabs defaultValue="liste">
      <TabsList>
        <TabsTrigger value="liste">Liste</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
      </TabsList>
      <TabsContent value="liste">
        <ProspectsList initialData={initialData} />
      </TabsContent>
      <TabsContent value="pipeline">
        <PipelineKanban initialData={initialData} />
      </TabsContent>
    </Tabs>
  );
}
