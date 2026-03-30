"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Mot de passe incorrect");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg ring-1 ring-foreground/5">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              WebAgency
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              CRM &mdash; Benjamin Bourger
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="h-10"
              />
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-10"
              disabled={loading || !password}
            >
              {loading ? "Connexion..." : "Accéder au CRM"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Steenvoorde &middot; Nord &middot; 59114
        </p>
      </div>
    </div>
  );
}
