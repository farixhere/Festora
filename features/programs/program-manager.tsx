"use client";

import { ArrowDown, ArrowUp, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Badge, Card } from "@/components/ui/primitives";
import { useServerAction, useServerForm } from "@/lib/hooks/use-server-action";
import {
  createProgramAction,
  deleteProgramAction,
  moveProgramAction,
  updateProgramAction,
} from "./actions";

export type ProgramView = {
  id: string;
  title: string;
  description: string;
  label: string;
  venue: string;
  startsLocal: string;
  endsLocal: string;
  whenText: string;
};

function ProgramForm({
  eventId,
  program,
  defaults,
  onDone,
}: {
  eventId: string;
  program?: ProgramView;
  defaults: { startsLocal: string; endsLocal: string };
  onDone: () => void;
}) {
  const { onSubmit, pending, fieldErrors: err } = useServerForm(
    (fd) => (program ? updateProgramAction(program.id, fd) : createProgramAction(eventId, fd)),
    { onSuccess: onDone },
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Program name" name="title" error={err.title} required>
        {(a) => <Input {...a} name="title" defaultValue={program?.title} maxLength={140} required />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" name="label" error={err.label} hint="e.g. Dance, Hackathon">
          {(a) => <Input {...a} name="label" defaultValue={program?.label} maxLength={40} />}
        </Field>
        <Field label="Venue / stage" name="venue" error={err.venue}>
          {(a) => <Input {...a} name="venue" defaultValue={program?.venue} maxLength={160} />}
        </Field>
        <Field label="Starts" name="startsAt" error={err.startsAt} required>
          {(a) => <Input {...a} type="datetime-local" name="startsAt" defaultValue={program?.startsLocal ?? defaults.startsLocal} required />}
        </Field>
        <Field label="Ends" name="endsAt" error={err.endsAt} required>
          {(a) => <Input {...a} type="datetime-local" name="endsAt" defaultValue={program?.endsLocal ?? defaults.endsLocal} required />}
        </Field>
      </div>
      <Field label="Description" name="description" error={err.description}>
        {(a) => <Textarea {...a} name="description" defaultValue={program?.description} maxLength={2000} className="min-h-[90px]" />}
      </Field>
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {program ? "Save program" : "Add program"}
      </Button>
    </form>
  );
}

export function ProgramManager({
  eventId,
  programs,
  defaults,
  timezoneLabel,
  canManage,
}: {
  eventId: string;
  programs: ProgramView[];
  defaults: { startsLocal: string; endsLocal: string };
  timezoneLabel: string;
  canManage: boolean;
}) {
  const { run, pending } = useServerAction();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Times are in <span className="font-semibold">{timezoneLabel}</span>. Use the arrows to reorder.
        </p>
        {canManage && (
          <FormDialog
            trigger={<Button size="sm"><Plus aria-hidden /> Add program</Button>}
            title="Add a program"
            description="A program is a track or activity within your event, like a competition or workshop."
          >
            {({ close }) => <ProgramForm eventId={eventId} defaults={defaults} onDone={close} />}
          </FormDialog>
        )}
      </div>

      <ol className="space-y-3">
        {programs.map((p, i) => (
          <li key={p.id}>
            <Card className="flex flex-wrap items-start gap-3 p-4">
              {canManage && (
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move ${p.title} up`} disabled={pending || i === 0} onClick={() => run(() => moveProgramAction(p.id, "up"))}>
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move ${p.title} down`} disabled={pending || i === programs.length - 1} onClick={() => run(() => moveProgramAction(p.id, "down"))}>
                    <ArrowDown aria-hidden />
                  </Button>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold">{p.title}</h3>
                  {p.label && <Badge tone="primary">{p.label}</Badge>}
                </div>
                <p className="mt-0.5 text-sm font-semibold text-primary">{p.whenText}</p>
                {p.venue && (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.venue}
                  </p>
                )}
                {p.description && <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{p.description}</p>}
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <FormDialog
                    trigger={<Button variant="outline" size="sm"><Pencil aria-hidden /> Edit</Button>}
                    title="Edit program"
                  >
                    {({ close }) => <ProgramForm eventId={eventId} program={p} defaults={defaults} onDone={close} />}
                  </FormDialog>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" aria-label={`Delete ${p.title}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden /></Button>}
                    title="Delete this program?"
                    description="Sessions linked to it stay on the schedule but are no longer grouped under it."
                    confirmLabel="Delete program"
                    destructive
                    onConfirm={() => deleteProgramAction(p.id)}
                  />
                </div>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
