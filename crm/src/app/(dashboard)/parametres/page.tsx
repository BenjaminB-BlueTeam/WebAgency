"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface ParamField {
  cle: string;
  label: string;
  type?: string;
  suffix?: string;
  placeholder?: string;
}

const PROFIL_FIELDS: ParamField[] = [
  { cle: "profil_nom", label: "Nom", placeholder: "Benjamin Bourger" },
  { cle: "profil_adresse", label: "Adresse", placeholder: "Steenvoorde, 59114" },
  { cle: "profil_telephone", label: "T\u00e9l\u00e9phone", placeholder: "06.63.78.57.62" },
  { cle: "profil_email", label: "Email", type: "email", placeholder: "contact@example.com" },
  { cle: "profil_siret", label: "SIRET", placeholder: "123 456 789 00012" },
];

const TARIF_FIELDS: ParamField[] = [
  { cle: "tarif_essentielle", label: "Prix Essentielle", type: "number", suffix: "\u20ac" },
  { cle: "tarif_professionnelle", label: "Prix Professionnelle", type: "number", suffix: "\u20ac" },
  { cle: "tarif_premium", label: "Prix Premium", type: "number", suffix: "\u20ac" },
  { cle: "tarif_maintenance", label: "Maintenance mensuelle", type: "number", suffix: "\u20ac/mois" },
  { cle: "tarif_modification", label: "Modification ponctuelle", type: "number", suffix: "\u20ac" },
];

export default function ParametresPage() {
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/parametres")
      .then((r) => r.json())
      .then((data) => {
        setParams(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Erreur lors du chargement des param\u00e8tres");
        setLoading(false);
      });
  }, []);

  function updateParam(cle: string, valeur: string) {
    setParams((prev) => ({ ...prev, [cle]: valeur }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/parametres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error();
      toast.success("Param\u00e8tres sauvegard\u00e9s");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Param&egrave;tres</h1>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Param&egrave;tres</h1>
        <p className="text-sm text-muted-foreground">
          Configuration de votre profil et tarification
        </p>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Vos informations personnelles et professionnelles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROFIL_FIELDS.map((field) => (
            <div key={field.cle} className="space-y-1.5">
              <label className="text-sm font-medium">{field.label}</label>
              <Input
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={params[field.cle] ?? ""}
                onChange={(e) => updateParam(field.cle, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tarifs */}
      <Card>
        <CardHeader>
          <CardTitle>Tarifs</CardTitle>
          <CardDescription>Grille tarifaire de r&eacute;f&eacute;rence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TARIF_FIELDS.map((field) => (
            <div key={field.cle} className="space-y-1.5">
              <label className="text-sm font-medium">{field.label}</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={params[field.cle] ?? ""}
                  onChange={(e) => updateParam(field.cle, e.target.value)}
                  className="flex-1"
                />
                {field.suffix && (
                  <span className="text-sm text-muted-foreground shrink-0 w-12">
                    {field.suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cl&eacute;s API */}
      <Card>
        <CardHeader>
          <CardTitle>Cl&eacute;s API</CardTitle>
          <CardDescription>
            Les cl&eacute;s API sont configur&eacute;es dans le fichier{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env.local</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pour des raisons de s&eacute;curit&eacute;, les cl&eacute;s API (Anthropic, Netlify, Google Places, Firecrawl)
            ne sont pas modifiables depuis cette interface. Modifiez-les directement dans le
            fichier <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env.local</code> &agrave; la
            racine du projet.
          </p>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sauvegarde en cours..." : "Sauvegarder les param\u00e8tres"}
        </Button>
      </div>
    </div>
  );
}
