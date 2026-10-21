"use client";

import { Button } from "@/components/ui/button";
import { useServerAction } from "@/lib/hooks/use-server-action";
import { setEventHiddenByAdminAction } from "@/features/admin/actions";

export function AdminHideButton({ eventId, hidden }: { eventId: string; hidden: boolean }) {
  const { run, pending } = useServerAction();
  return (
    <Button
      size="sm"
      variant={hidden ? "outline" : "destructive"}
      loading={pending}
      onClick={() => run(() => setEventHiddenByAdminAction(eventId, !hidden))}
    >
      {hidden ? "Restore" : "Hide"}
    </Button>
  );
}
