// crm/src/components/prospects/email-preview-panel.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface EmailPreviewPanelProps {
  prospectId: string;
  onClose: () => void;
  onSent: () => void;
}

export function EmailPreviewPanel({ prospectId, onClose, onSent }: EmailPreviewPanelProps) {
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [sms, setSms] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erreur génération"); return; }
      setSujet(data.sujet ?? "");
      setCorps(data.corps ?? "");
      setSms(data.variante_sms ?? "");
    } catch { toast.error("Erreur réseau"); }
    finally { setLoading(false); }
  }

  async function send() {
    setSending(true);
    setConfirmSend(false);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send: true, sujet, corps }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Envoi échoué"); return; }
      if (data.sent) { onSent(); }
    } catch { toast.error("Erreur réseau"); }
    finally { setSending(false); }
  }

  if (!sujet && !loading) {
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <button type="button" onClick={generate}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-medium text-white">
          ✉ Générer email ciblé
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-white/30">Email ciblé</span>
        <button type="button" onClick={onClose} className="text-white/20 hover:text-white/50">
          <X className="size-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-white/40">
          <Loader2 className="size-3 animate-spin" /> Génération en cours…
        </div>
      ) : (
        <>
          {/* Sujet */}
          <div>
            <p className="text-[10px] uppercase text-white/30 mb-1">Sujet</p>
            <input
              type="text"
              value={sujet}
              onChange={e => setSujet(e.target.value)}
              className="w-full rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Corps */}
          <div>
            <p className="text-[10px] uppercase text-white/30 mb-1">Corps</p>
            <textarea
              value={corps}
              onChange={e => setCorps(e.target.value)}
              rows={8}
              className="w-full resize-none rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* SMS variante */}
          {sms && (
            <div className="bg-white/3 rounded p-2">
              <p className="text-[10px] uppercase text-white/30 mb-1">Variante SMS / WhatsApp</p>
              <p className="text-xs text-white/50">{sms}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
              <RefreshCw className="size-3" /> Regénérer
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {confirmSend ? (
                <>
                  <span className="text-xs text-white/50">Confirmer l&apos;envoi ?</span>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmSend(false)}>Annuler</Button>
                  <Button size="sm" onClick={send} disabled={sending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    {sending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    Envoyer
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setConfirmSend(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Send className="size-3" /> Envoyer via Himalaya
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Ajouter réponse reçue */}
      <AddReplySection prospectId={prospectId} />
    </div>
  );
}

function AddReplySection({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/activites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "EMAIL_RECU", description: text.trim() }),
      });
      if (res.ok) {
        setText("");
        setOpen(false);
        toast.success("Réponse enregistrée");
      }
    } catch { toast.error("Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <div className="border-t border-border/20 pt-2 mt-1">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="text-xs text-white/30 hover:text-white/60 transition-colors">
          + Ajouter une réponse reçue du prospect
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase text-white/30">Réponse reçue (coller ici)</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="Coller la réponse du prospect…"
            className="w-full resize-none rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={save} disabled={saving || !text.trim()}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
