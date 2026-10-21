"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cancelOwnRegistrationAction } from "./actions";

export function CancelRegistrationButton({ code }: { code: string }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="outline">Cancel registration</Button>}
      title="Cancel your registration?"
      description="Your seat will be released for someone else. You can register again later if spots are still available."
      confirmLabel="Yes, cancel it"
      destructive
      onConfirm={() => cancelOwnRegistrationAction(code)}
    />
  );
}
