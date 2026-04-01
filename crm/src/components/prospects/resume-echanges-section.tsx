"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface ResumeEchangesSectionProps {
  prospectId: string;
}

export function ResumeEchangesSection({ prospectId }: ResumeEchangesSectionProps) {
  const [resume, setResume] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResume() {
      try {
        const res = await fetch(`/api/prospects/${prospectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.resumeEchanges && data.resumeEchanges !== "Aucun échange enregistré.") {
          setResume(data.resumeEchanges);
        }
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }
    fetchResume();
  }, [prospectId]);

  if (loading || !resume) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          Résumé des échanges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {resume}
        </p>
      </CardContent>
    </Card>
  );
}
