"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NOTE_TYPES = [
  { value: "APPEL", label: "Appel" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "VISITE", label: "Visite" },
  { value: "RDV", label: "RDV" },
  { value: "NOTE", label: "Note" },
];

interface AddNoteDialogProps {
  prospectId: string;
}

export function AddNoteDialog({ prospectId }: AddNoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("NOTE");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      await fetch(`/api/prospects/${prospectId}/activites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description: description.trim() }),
      });
      setOpen(false);
      setDescription("");
      setType("NOTE");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" />
        }
      >
        <Plus className="size-4" />
        Ajouter une note
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une activité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type d'activité" />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'activité..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !description.trim()}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
