"use client";

import * as React from "react";
import { toast } from "sonner";
import { ImagePlus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { EventCover } from "@/components/events/event-cover";
import { COVER_ARTS } from "@/lib/covers";
import { EVENT_CATEGORIES, EVENT_MODES } from "@/lib/constants";
import { COMMON_TIMEZONES } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { useServerForm } from "@/lib/hooks/use-server-action";
import { createEventAction, updateEventAction } from "./actions";
import type { EventFormDefaults } from "./form-defaults";

type Props = {
  mode: "create" | "edit";
  eventId?: string;
  defaults: EventFormDefaults;
  canUpload: boolean;
  readOnly?: boolean;
};

export function EventForm({ mode, eventId, defaults, canUpload, readOnly = false }: Props) {
  const { onSubmit, pending, fieldErrors, formError } = useServerForm<unknown>((fd) =>
    mode === "create" ? createEventAction(fd) : updateEventAction(eventId!, fd),
  );
  const [eventMode, setEventMode] = React.useState(defaults.mode);
  const [cover, setCover] = React.useState(defaults.coverImage);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const timezones = React.useMemo(() => {
    const set = new Set<string>(COMMON_TIMEZONES);
    set.add(defaults.timezone);
    return [...set];
  }, [defaults.timezone]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be 4 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "Upload failed. Please try again.");
        return;
      }
      setCover(json.url);
      toast.success("Cover image uploaded.");
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  const disabled = readOnly;
  const err = fieldErrors;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && Object.keys(err).length === 0 && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}
      {readOnly && (
        <p role="note" className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          Your role has read-only access to this event.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>What people see first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Event title" name="title" error={err.title} required>
            {(a) => <Input {...a} name="title" defaultValue={defaults.title} maxLength={120} required disabled={disabled} />}
          </Field>
          <Field label="Short summary" name="shortDescription" error={err.shortDescription} required hint="One or two lines shown on event cards (max 200 characters).">
            {(a) => <Textarea {...a} name="shortDescription" defaultValue={defaults.shortDescription} maxLength={200} className="min-h-[72px]" required disabled={disabled} />}
          </Field>
          <Field label="Full description" name="description" error={err.description} hint="Plain text. Line breaks are kept.">
            {(a) => <Textarea {...a} name="description" defaultValue={defaults.description} maxLength={10000} className="min-h-[160px]" disabled={disabled} />}
          </Field>
          <Field label="Category" name="category" error={err.category} required>
            {(a) => (
              <Select {...a} name="category" defaultValue={defaults.category} required disabled={disabled}>
                <option value="" disabled>Choose a category</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cover</CardTitle>
          <CardDescription>Pick a built-in design, or upload your own image.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="hidden" name="coverImage" value={cover} />
          <div className="aspect-[5/2] max-w-xl overflow-hidden rounded-2xl border">
            <EventCover value={cover || null} seed={defaults.title || "festora"} />
          </div>
          <div role="radiogroup" aria-label="Built-in cover designs" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {COVER_ARTS.map((c) => {
              const value = `art:${c.key}`;
              const selected = cover === value;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c.label}
                  disabled={disabled}
                  onClick={() => setCover(value)}
                  className={cn(
                    "aspect-[5/3] overflow-hidden rounded-xl border-2 transition-all",
                    selected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-input",
                  )}
                >
                  <EventCover value={value} seed={c.key} />
                </button>
              );
            })}
          </div>
          {!disabled && (
            <div className="flex flex-wrap items-center gap-3">
              {canUpload ? (
                <>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} aria-label="Upload a cover image" />
                  <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                    <ImagePlus aria-hidden /> Upload image
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Image uploads aren&apos;t enabled on this deployment (see README). You can still paste an https:// link below.
                </p>
              )}
              <div className="flex min-w-[220px] flex-1 items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <label htmlFor="cover-url" className="sr-only">Image link</label>
                <Input
                  id="cover-url"
                  type="url"
                  placeholder="…or paste an https:// image link"
                  value={cover.startsWith("art:") ? "" : cover}
                  onChange={(e) => setCover(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
          {err.coverImage && (
            <p role="alert" className="text-sm font-medium text-destructive">{err.coverImage}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When</CardTitle>
          <CardDescription>Times are entered in the event&apos;s own timezone and shown that way to everyone.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Timezone" name="timezone" error={err.timezone} required className="sm:col-span-2">
            {(a) => (
              <Select {...a} name="timezone" defaultValue={defaults.timezone} disabled={disabled}>
                {timezones.map((z) => (
                  <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Starts" name="startsAt" error={err.startsAt} required>
            {(a) => <Input {...a} type="datetime-local" name="startsAt" defaultValue={defaults.startsAt} required disabled={disabled} />}
          </Field>
          <Field label="Ends" name="endsAt" error={err.endsAt} required>
            {(a) => <Input {...a} type="datetime-local" name="endsAt" defaultValue={defaults.endsAt} required disabled={disabled} />}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Format" name="mode" error={err.mode} required>
            {(a) => (
              <Select {...a} name="mode" value={eventMode} onChange={(e) => setEventMode(e.target.value)} disabled={disabled}>
                {EVENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            )}
          </Field>
          {eventMode !== "online" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue" name="venue" error={err.venue} required>
                {(a) => <Input {...a} name="venue" defaultValue={defaults.venue} maxLength={200} disabled={disabled} />}
              </Field>
              <Field label="City" name="city" error={err.city}>
                {(a) => <Input {...a} name="city" defaultValue={defaults.city} maxLength={120} disabled={disabled} />}
              </Field>
            </div>
          )}
          {eventMode !== "in_person" && (
            <Field
              label="Online meeting link"
              name="onlineUrl"
              error={err.onlineUrl}
              required
              hint="Only shown to people whose registration is confirmed."
            >
              {(a) => <Input {...a} type="url" name="onlineUrl" defaultValue={defaults.onlineUrl} maxLength={500} placeholder="https://" disabled={disabled} />}
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
          <CardDescription>Deadlines and capacity are enforced on the server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Checkbox name="registrationEnabled" label="Accept registrations" description="Turn off to show the event without a sign-up form." defaultChecked={defaults.registrationEnabled} disabled={disabled} />
          <Checkbox name="requiresApproval" label="Require approval" description="New registrations start as pending until an organizer approves them." defaultChecked={defaults.requiresApproval} disabled={disabled} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Capacity" name="capacity" error={err.capacity} hint="Leave empty for unlimited.">
              {(a) => <Input {...a} name="capacity" inputMode="numeric" defaultValue={defaults.capacity} placeholder="e.g. 200" disabled={disabled} />}
            </Field>
            <Field label="Opens" name="registrationOpensAt" error={err.registrationOpensAt} hint="Optional">
              {(a) => <Input {...a} type="datetime-local" name="registrationOpensAt" defaultValue={defaults.registrationOpensAt} disabled={disabled} />}
            </Field>
            <Field label="Closes" name="registrationClosesAt" error={err.registrationClosesAt} hint="Optional">
              {(a) => <Input {...a} type="datetime-local" name="registrationClosesAt" defaultValue={defaults.registrationClosesAt} disabled={disabled} />}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility & organizer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Visibility" name="visibility" error={err.visibility} required hint="Private events are reachable only through their link and never appear in search or discovery.">
            {(a) => (
              <Select {...a} name="visibility" defaultValue={defaults.visibility} disabled={disabled}>
                <option value="public">Public — listed in Explore</option>
                <option value="unlisted">Private — link only</option>
              </Select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organizer name" name="organizerName" error={err.organizerName} required>
              {(a) => <Input {...a} name="organizerName" defaultValue={defaults.organizerName} maxLength={120} required disabled={disabled} />}
            </Field>
            <Field label="Contact email" name="organizerEmail" error={err.organizerEmail} hint="Shown publicly on the event page. Optional.">
              {(a) => <Input {...a} type="email" name="organizerEmail" defaultValue={defaults.organizerEmail} maxLength={200} disabled={disabled} />}
            </Field>
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="sticky bottom-20 z-20 flex justify-end gap-3 rounded-2xl border bg-card/95 p-3 shadow-lift backdrop-blur lg:bottom-4">
          <Button type="submit" size="lg" loading={pending}>
            {mode === "create" ? "Save as draft" : "Save changes"}
          </Button>
        </div>
      )}
    </form>
  );
}
