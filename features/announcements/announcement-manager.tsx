"use client";

import { Info, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { LocalTime } from "@/components/ui/local-time";
import { useServerAction, useServerForm } from "@/lib/hooks/use-server-action";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  setAnnouncementPublishedAction,
  updateAnnouncementAction,
} from "./actions";

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  publishedAtIso: string | null;
  createdAtIso: string;
  eventTitle?: string;
};

function AnnouncementForm({
  eventId,
  eventOptions,
  item,
  onDone,
}: {
  eventId?: string;
  eventOptions?: { id: string; title: string }[];
  item?: AnnouncementView;
  onDone: () => void;
}) {
  const { onSubmit, pending, fieldErrors: err } = useServerForm(
    (fd) =>
      item
        ? updateAnnouncementAction(item.id, fd)
        : createAnnouncementAction(eventId ?? String(fd.get("eventId") ?? ""), fd),
    { onSuccess: onDone },
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {!item && !eventId && eventOptions && (
        <Field label="Event" name="eventId" required>
          {(a) => (
            <Select {...a} name="eventId" defaultValue="" required>
              <option value="" disabled>Choose an event</option>
              {eventOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Field label="Title" name="title" error={err.title} required>
        {(a) => <Input {...a} name="title" defaultValue={item?.title} maxLength={140} required />}
      </Field>
      <Field label="Message" name="body" error={err.body} required>
        {(a) => <Textarea {...a} name="body" defaultValue={item?.body} maxLength={5000} className="min-h-[140px]" required />}
      </Field>
      {!item && (
        <Checkbox name="publish" label="Publish immediately" description="Otherwise it's saved as a draft only your team can see." />
      )}
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {item ? "Save changes" : "Create announcement"}
      </Button>
    </form>
  );
}

export function AnnouncementManager({
  announcements,
  eventId,
  eventOptions,
  canManage,
}: {
  announcements: AnnouncementView[];
  eventId?: string;
  eventOptions?: { id: string; title: string }[];
  canManage: boolean;
}) {
  const { run, pending } = useServerAction();
  const canCreate = canManage && (Boolean(eventId) || (eventOptions?.length ?? 0) > 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <p className="flex max-w-2xl items-start gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Published announcements appear on the public event page. Email and push notifications
          aren&apos;t connected yet, so participants aren&apos;t notified automatically.
        </p>
        {canCreate && (
          <FormDialog
            trigger={<Button><Plus aria-hidden /> New announcement</Button>}
            title="New announcement"
            description="Share an update with everyone viewing the event page."
          >
            {({ close }) => <AnnouncementForm eventId={eventId} eventOptions={eventOptions} onDone={close} />}
          </FormDialog>
        )}
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="No announcements yet"
          description="Post schedule changes, reminders or venue updates here."
        />
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{a.title}</h3>
                      <Badge tone={a.status === "published" ? "success" : "warning"} className="capitalize">{a.status}</Badge>
                    </div>
                    {a.eventTitle && <p className="text-xs font-semibold text-primary">{a.eventTitle}</p>}
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {a.status === "published" && a.publishedAtIso ? (
                        <>Published <LocalTime iso={a.publishedAtIso} /></>
                      ) : (
                        <>Created <LocalTime iso={a.createdAtIso} /></>
                      )}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={a.status === "published" ? "secondary" : "primary"}
                        loading={pending}
                        onClick={() => run(() => setAnnouncementPublishedAction(a.id, a.status !== "published"))}
                      >
                        {a.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <FormDialog trigger={<Button size="sm" variant="outline"><Pencil aria-hidden /> Edit</Button>} title="Edit announcement">
                        {({ close }) => <AnnouncementForm item={a} onDone={close} />}
                      </FormDialog>
                      <ConfirmDialog
                        trigger={<Button size="icon" variant="ghost" aria-label={`Delete ${a.title}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden /></Button>}
                        title="Delete this announcement?"
                        description="It will be removed from the event page if it was published."
                        confirmLabel="Delete"
                        destructive
                        onConfirm={() => deleteAnnouncementAction(a.id)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
