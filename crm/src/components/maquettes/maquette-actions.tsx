"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface MaquetteActionsProps {
  id: string;
  statut: string;
  retourClient: string | null;
  demoUrl: string | null;
  propositionUrl: string | null;
  prospectNom: string;
}

const STATUTS = ["BROUILLON", "DEPLOYE", "ENVOYE", "VALIDE", "REFUSE"];

export function MaquetteActions({
  id,
  statut: initialStatut,
  retourClient: initialRetour,
  demoUrl,
  propositionUrl,
  prospectNom,
}: MaquetteActionsProps) {
  const router = useRouter();
  const [statut, setStatut] = useState(initialStatut);
  const [retourClient, setRetourClient] = useState(initialRetour ?? "");
  const [saving, setSaving] = useState(false);

  async function handleStatutChange(newStatut: string | null) {
    if (!newStatut) return;
    setStatut(newStatut);
    await save({ statut: newStatut });
  }

  async function handleSaveRetour() {
    await save({ retourClient });
  }

  async function save(data: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/maquettes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      toast.success("Sauvegard\u00e9");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  function copySms() {
    const url = propositionUrl || demoUrl || "";
    const text = `Bonjour, voici un aper\u00e7u de votre futur site : ${url} \u2014 Dites-moi ce que vous en pensez ! Benjamin, 06.63.78.57.62`;
    navigator.clipboard.writeText(text).then(
      () => toast.success("SMS copi\u00e9 dans le presse-papier"),
      () => toast.error("Impossible de copier")
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status dropdown */}
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Statut</label>
          <Select value={statut} onValueChange={handleStatutChange} disabled={saving}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {demoUrl && (
            <a href={demoUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="size-3.5" />
                Ouvrir la d&eacute;mo
              </Button>
            </a>
          )}
          {(demoUrl || propositionUrl) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={copySms}
            >
              <Copy className="size-3.5" />
              Copier le SMS
            </Button>
          )}
        </div>

        {/* Retour client */}
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">
            Retour client
          </label>
          <Textarea
            placeholder="Notes sur le retour du client..."
            value={retourClient}
            onChange={(e) => setRetourClient(e.target.value)}
            rows={4}
          />
          <Button
            size="sm"
            onClick={handleSaveRetour}
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Enregistrer le retour"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
