// crm/src/components/prospects/email-preview-panel.tsx
"use client";

interface EmailPreviewPanelProps {
  prospectId: string;
  onClose: () => void;
  onSent: () => void;
}

export function EmailPreviewPanel({ onClose }: EmailPreviewPanelProps) {
  return (
    <div className="flex flex-col gap-3 py-4">
      <p className="text-xs text-white/30 italic">Email panel — en cours d'implémentation…</p>
      <button type="button" onClick={onClose} className="text-xs text-white/40 hover:text-white/70 transition-colors">
        Fermer
      </button>
    </div>
  );
}
