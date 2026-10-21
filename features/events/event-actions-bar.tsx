"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Copy, Eye, EyeOff, ExternalLink, Rocket, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useServerAction } from "@/lib/hooks/use-server-action";
import { deleteEventAction, duplicateEventAction, setEventStatusAction } from "./actions";
import type { EventStatus } from "@/lib/db/schema";

type Props = {
  eventId: string;
  title: string;
  slug: string;
  status: EventStatus;
  canPublish: boolean;
  canCreate: boolean;
  canDelete: boolean;
};

export function EventActionsBar({ eventId, title, slug, status, canPublish, canCreate, canDelete }: Props) {
  const { run, pending } = useServerAction();
  const set = (next: EventStatus) => run(() => setEventStatusAction(eventId, next));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "published" ? (
        <Link href={`/events/${slug}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ExternalLink aria-hidden /> View public page
        </Link>
      ) : (
        <Link href={`/dashboard/events/${eventId}/preview`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Eye aria-hidden /> Preview
        </Link>
      )}

      {canPublish && status === "draft" && (
        <Button size="sm" loading={pending} onClick={() => set("published")}>
          <Rocket aria-hidden /> Publish
        </Button>
      )}
      {canPublish && status === "published" && (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => set("draft")}>
          <EyeOff aria-hidden /> Unpublish
        </Button>
      )}
      {canPublish && status === "archived" && (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => set("draft")}>
          <ArchiveRestore aria-hidden /> Restore
        </Button>
      )}
      {canPublish && status !== "archived" && (
        <ConfirmDialog
          trigger={<Button size="sm" variant="outline"><Archive aria-hidden /> Archive</Button>}
          title="Archive this event?"
          description="It will disappear from the public site and registration will close. You can restore it later and all data is kept."
          confirmLabel="Archive event"
          onConfirm={() => setEventStatusAction(eventId, "archived")}
        />
      )}
      {canCreate && (
        <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => duplicateEventAction(eventId))}>
          <Copy aria-hidden /> Duplicate
        </Button>
      )}
      {canDelete && (
        <ConfirmDialog
          trigger={<Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden /> Delete</Button>}
          title="Delete this event permanently?"
          description="This removes the event, its programs, schedule and announcements. Events with active registrations can't be deleted — archive them instead."
          confirmLabel="Delete forever"
          destructive
          requireText={title}
          onConfirm={(typed) => deleteEventAction(eventId, typed)}
        />
      )}
    </div>
  );
}
