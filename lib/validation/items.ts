import { z } from "zod";
import { zonedLocalToUtc } from "@/lib/utils/dates";
import { zodFieldErrors } from "@/lib/utils/result";

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type TimeWindow = { startsAt: Date; endsAt: Date; timezone: string };

function checkTimes(
  startLocal: string,
  endLocal: string,
  win: TimeWindow,
  errors: Record<string, string>,
): { startsAt: Date; endsAt: Date } | null {
  const startsAt = zonedLocalToUtc(startLocal, win.timezone);
  const endsAt = zonedLocalToUtc(endLocal, win.timezone);
  if (!startsAt) errors.startsAt = "Enter a valid start time";
  if (!endsAt) errors.endsAt = "Enter a valid end time";
  if (!startsAt || !endsAt) return null;
  if (endsAt.getTime() <= startsAt.getTime()) {
    errors.endsAt = "End must be after the start";
  } else if (
    startsAt.getTime() < win.startsAt.getTime() ||
    endsAt.getTime() > win.endsAt.getTime()
  ) {
    errors.startsAt = "Times must fall within the event's start and end";
  }
  return { startsAt, endsAt };
}

/* ───────────── Programs ───────────── */

const programSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(140, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long"),
  label: z.string().trim().max(40, "Label is too long"),
  venue: z.string().trim().max(160, "Venue is too long"),
  startsAt: z.string().regex(LOCAL_DT, "Enter a valid start time"),
  endsAt: z.string().regex(LOCAL_DT, "Enter a valid end time"),
});

export type ProgramInput = {
  title: string;
  description: string;
  label: string;
  venue: string;
  startsAt: Date;
  endsAt: Date;
};

export function parseProgramForm(
  raw: Record<string, string>,
  win: TimeWindow,
):
  | { ok: true; data: ProgramInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = programSchema.safeParse({
    description: "",
    label: "",
    venue: "",
    ...raw,
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  const errors: Record<string, string> = {};
  const times = checkTimes(v.startsAt, v.endsAt, win, errors);
  if (!times || Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    data: {
      title: v.title,
      description: v.description,
      label: v.label,
      venue: v.venue,
      startsAt: times.startsAt,
      endsAt: times.endsAt,
    },
  };
}

/* ───────────── Schedule items ───────────── */

const scheduleSchema = z.object({
  title: z.string().trim().min(2, "Session title is required").max(140, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long"),
  speaker: z.string().trim().max(120, "Name is too long"),
  stage: z.string().trim().max(120, "Stage is too long"),
  programId: z.string().trim(),
  startsAt: z.string().regex(LOCAL_DT, "Enter a valid start time"),
  endsAt: z.string().regex(LOCAL_DT, "Enter a valid end time"),
});

export type ScheduleInput = {
  title: string;
  description: string;
  speaker: string;
  stage: string;
  programId: string | null;
  startsAt: Date;
  endsAt: Date;
};

export function parseScheduleForm(
  raw: Record<string, string>,
  win: TimeWindow,
):
  | { ok: true; data: ScheduleInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = scheduleSchema.safeParse({
    description: "",
    speaker: "",
    stage: "",
    programId: "",
    ...raw,
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  const errors: Record<string, string> = {};
  const times = checkTimes(v.startsAt, v.endsAt, win, errors);
  if (!times || Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    data: {
      title: v.title,
      description: v.description,
      speaker: v.speaker,
      stage: v.stage,
      programId: v.programId || null,
      startsAt: times.startsAt,
      endsAt: times.endsAt,
    },
  };
}

/* ───────────── Announcements ───────────── */

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140, "Title is too long"),
  body: z.string().trim().min(1, "Write the announcement").max(5000, "Announcement is too long"),
});
