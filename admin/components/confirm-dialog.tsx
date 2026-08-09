"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, the user must type this phrase to confirm. */
  confirmPhrase?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  confirmPhrase,
  busy = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [phrase, setPhrase] = useState("");
  const requiresPhrase = Boolean(confirmPhrase);
  const canConfirm = !requiresPhrase || phrase === confirmPhrase;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm();
    setPhrase("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setPhrase("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requiresPhrase && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This action is destructive. Type <span className="font-mono font-semibold">{confirmPhrase}</span> to
              continue.
            </p>
            <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={confirmPhrase} autoFocus />
          </div>
        )}
        {children}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={!canConfirm || busy} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
