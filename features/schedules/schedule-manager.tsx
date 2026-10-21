"use client";

import * as React from "react";
import { Globe, Lock, MapPin, Mic2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Badge, Card } from "@/components/ui/primitives";
import { setSchedulePublishedAction } from "@/features/events/actions";
import { useServerAction, useServerForm } from "@/lib/hooks/use-server-action";
import { cn } from "@/lib/utils/cn";
import {
  createScheduleItemAction,
  deleteScheduleItemAction,
  updateScheduleItemAction,
} from "./actions";

export type ScheduleView = {
  id: string;
  title: string;
  description: string;
  speaker: string;
  stage: string;
  programId: string | null;
  startsLocal: string;
  endsLocal: string;
  dayText: string;
  whenText: string;
};

type ProgramOption = { id: string; title: string };

function SessionForm({
  eventId,
  item,
  programs,
  defaults,
  onDone,
}: {
  eventId: string;
  item?: ScheduleView;
  programs: ProgramOption[];
  defaults: { startsLocal: string; endsLocal: string };
  onDone: () => void;
}) {
  const { onSubmit, pending, fieldErrors: err } = useServerForm(
    (fd) => (item ? updateScheduleItemAction(item.id, fd) : createScheduleItemAction(eventId, fd)),
    { onSuccess: onDone },
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Session title" name="title" error={err.title} required>
        {(a) => <Input {...a} name="title" defaultValue={item?.title} maxLength={140} required />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" name="startsAt" error={err.startsAt} required>
          {(a) => <Input {...a} type="datetime-local" name="startsAt" defaultValue={item?.startsLocal ?? defaults.startsLocal} required />}
        </Field>
        <Field label="Ends" name="endsAt" error={err.endsAt} required>
          {(a) => <Input {...a} type="datetime-local" name="endsAt" defaultValue={item?.endsLocal ?? defaults.endsLocal} required />}
        </Field>
        <Field label="Stage / venue" name="stage" error={err.stage}>
          {(a) => <Input {...a} name="stage" defaultValue={item?.stage} maxLength={120} />}
        </Field>
        <Field label="Speaker / host" name="speaker" error={err.speaker}>
          {(a) => <Input {...a} name="speaker" defaultValue={item?.speaker} maxLength={120} />}
        </Field>
      </div>
      <Field label="Program" name="programId" error={err.programId} hint="Optional — group this session under a program.">
        {(a) => (
          <Select {...a} name="programId" defaultValue={item?.programId ?? ""}>
            <option value="">No program</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Description" name="description" error={err.description}>
        {(a) => <Textarea {...a} name="description" defaultValue={item?.description} maxLength={2000} className="min-h-[80px]" />}
      </Field>
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {item ? "Save session" : "Add session"}
      </Button>
    </form>
  );
}

export function ScheduleManager({
  eventId,
  items,
  programs,
  defaults,
  canManage,
  published,
  timezoneLabel,
  timeline,
}: {
  eventId: string;
  items: ScheduleView[];
  programs: ProgramOption[];
  defaults: { startsLocal: string; endsLocal: string };
  canManage: boolean;
  published: boolean;
  timezoneLabel: string;
  /** Server-rendered public-style timeline. */
  timeline: React.ReactNode;
}) {
  const [view, setView] = React.useState<"timeline" | "list">("timeline");
  const { run, pending } = useServerAction();
  const programTitle = new Map(programs.map((p) => [p.id, p.title]));

  return (
    <div>
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            {published ? <Globe className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          </span>
          <div>
            <p className="font-bold">{published ? "Schedule is public" : "Schedule is hidden"}</p>
            <p className="text-sm text-muted-foreground">
              {published
                ? "Visitors see programs and sessions on the event page."
                : "Visitors can't see programs or sessions yet."}
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            variant={published ? "secondary" : "primary"}
            size="sm"
            loading={pending}
            onClick={() => run(() => setSchedulePublishedAction(eventId, !published))}
          >
            {published ? "Unpublish schedule" : "Publish schedule"}
          </Button>
        )}
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Schedule view" className="inline-flex rounded-xl border bg-card p-1">
          {(["timeline", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-muted-foreground sm:block">
            Times in <span className="font-semibold">{timezoneLabel}</span>
          </p>
          {canManage && (
            <FormDialog
              trigger={<Button size="sm"><Plus aria-hidden /> Add session</Button>}
              title="Add a session"
              description="Sessions appear in chronological order on the schedule."
            >
              {({ close }) => <SessionForm eventId={eventId} programs={programs} defaults={defaults} onDone={close} />}
            </FormDialog>
          )}
        </div>
      </div>

      {view === "timeline" ? (
        timeline
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary">{i.dayText} · {i.whenText}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{i.title}</h3>
                    {i.programId && programTitle.get(i.programId) && <Badge tone="primary">{programTitle.get(i.programId)}</Badge>}
                  </div>
                  {(i.stage || i.speaker) && (
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {i.stage && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{i.stage}</span>}
                      {i.speaker && <span className="inline-flex items-center gap-1"><Mic2 className="h-3.5 w-3.5" aria-hidden />{i.speaker}</span>}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <FormDialog trigger={<Button variant="outline" size="sm"><Pencil aria-hidden /> Edit</Button>} title="Edit session">
                      {({ close }) => <SessionForm eventId={eventId} item={i} programs={programs} defaults={defaults} onDone={close} />}
                    </FormDialog>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon" aria-label={`Delete ${i.title}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden /></Button>}
                      title="Remove this session?"
                      description="It will be removed from the schedule."
                      confirmLabel="Remove session"
                      destructive
                      onConfirm={() => deleteScheduleItemAction(i.id)}
                    />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
