"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useServerAction } from "@/lib/hooks/use-server-action";
import type { ActionResult } from "@/lib/utils/result";

type Props = {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** When set, the user must type this exact text to enable the confirm button. */
  requireText?: string;
  onConfirm: (typed: string) => Promise<ActionResult<unknown>>;
};

/** Accessible confirmation step for destructive or high-impact actions. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  requireText,
  onConfirm,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const { run, pending } = useServerAction();
  const blocked = requireText !== undefined && typed.trim() !== requireText;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTyped("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {requireText !== undefined && (
          <div className="mt-4">
            <label htmlFor="confirm-text" className="mb-1.5 block text-sm font-semibold">
              Type <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{requireText}</span> to confirm
            </label>
            <Input
              id="confirm-text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            loading={pending}
            disabled={blocked}
            onClick={() =>
              run(() => onConfirm(typed), {
                onSuccess: () => setOpen(false),
              })
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
