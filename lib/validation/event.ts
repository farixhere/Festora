import { z } from "zod";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { isCoverValue } from "@/lib/covers";
import { isValidTimeZone, zonedLocalToUtc } from "@/lib/utils/dates";
import { zodFieldErrors } from "@/lib/utils/result";

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export type EventInput = {
  title: string;
  shortDescription: string;
  description: string;
  category: (typeof EVENT_CATEGORIES)[number];
  mode: "in_person" | "online" | "hybrid";
  venue: string;
  city: string;
  onlineUrl: string;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
  registrationEnabled: boolean;
  requiresApproval: boolean;
  visibility: "public" | "unlisted";
  coverImage: string | null;
  organizerName: string;
  organizerEmail: string;
};

const baseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer"),
  shortDescription: z
    .string()
    .trim()
    .min(10, "Add a short summary (at least 10 characters)")
    .max(200, "Summary must be 200 characters or fewer"),
  description: z.string().trim().max(10000, "Description is too long"),
  category: z.enum(EVENT_CATEGORIES, {
    errorMap: () => ({ message: "Choose a category" }),
  }),
  mode: z.enum(["in_person", "online", "hybrid"], {
    errorMap: () => ({ message: "Choose how the event is held" }),
  }),
  venue: z.string().trim().max(200, "Venue is too long"),
  city: z.string().trim().max(120, "City is too long"),
  onlineUrl: z.string().trim().max(500, "Link is too long"),
  timezone: z.string().refine(isValidTimeZone, "Unknown timezone"),
  startsAt: z.string().regex(LOCAL_DT, "Enter a valid start date and time"),
  endsAt: z.string().regex(LOCAL_DT, "Enter a valid end date and time"),
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  capacity: z.string().trim(),
  visibility: z.enum(["public", "unlisted"], {
    errorMap: () => ({ message: "Choose a visibility" }),
  }),
  coverImage: z.string().trim().max(500),
  organizerName: z
    .string()
    .trim()
    .min(2, "Organizer name is required")
    .max(120, "Organizer name is too long"),
  organizerEmail: z.string().trim().max(200),
});

const DEFAULTS: Record<string, string> = {
  description: "",
  venue: "",
  city: "",
  onlineUrl: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: "",
  coverImage: "",
  organizerEmail: "",
};

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export type EventParseResult =
  | { ok: true; data: EventInput }
  | { ok: false; fieldErrors: Record<string, string> };

/**
 * Validates raw form values and converts wall-clock times (typed in the
 * event's timezone) to UTC instants. All business rules live here so the
 * server never trusts the browser.
 */
export function parseEventForm(raw: Record<string, string>): EventParseResult {
  const parsed = baseSchema.safeParse({ ...DEFAULTS, ...raw });
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const v = parsed.data;
  const errors: Record<string, string> = {};

  const startsAt = zonedLocalToUtc(v.startsAt, v.timezone);
  const endsAt = zonedLocalToUtc(v.endsAt, v.timezone);
  if (!startsAt) errors.startsAt = "Enter a valid start date and time";
  if (!endsAt) errors.endsAt = "Enter a valid end date and time";
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    errors.endsAt = "End must be after the start";
  }

  let opens: Date | null = null;
  let closes: Date | null = null;
  if (v.registrationOpensAt) {
    if (!LOCAL_DT.test(v.registrationOpensAt)) {
      errors.registrationOpensAt = "Enter a valid date and time";
    } else {
      opens = zonedLocalToUtc(v.registrationOpensAt, v.timezone);
      if (!opens) errors.registrationOpensAt = "Enter a valid date and time";
    }
  }
  if (v.registrationClosesAt) {
    if (!LOCAL_DT.test(v.registrationClosesAt)) {
      errors.registrationClosesAt = "Enter a valid date and time";
    } else {
      closes = zonedLocalToUtc(v.registrationClosesAt, v.timezone);
      if (!closes) errors.registrationClosesAt = "Enter a valid date and time";
    }
  }
  if (opens && closes && closes.getTime() <= opens.getTime()) {
    errors.registrationClosesAt = "Registration must close after it opens";
  }
  if (closes && endsAt && closes.getTime() > endsAt.getTime()) {
    errors.registrationClosesAt = "Registration must close before the event ends";
  }

  let capacity: number | null = null;
  if (v.capacity !== "") {
    if (!/^\d+$/.test(v.capacity)) {
      errors.capacity = "Capacity must be a whole number";
    } else {
      capacity = Number(v.capacity);
      if (capacity < 1 || capacity > 100000) {
        errors.capacity = "Capacity must be between 1 and 100,000";
      }
    }
  }

  if (v.mode !== "online" && !v.venue) {
    errors.venue = "Add a venue for in-person and hybrid events";
  }
  if (v.mode !== "in_person") {
    if (!v.onlineUrl) errors.onlineUrl = "Add the online meeting link";
    else if (!isHttpUrl(v.onlineUrl)) errors.onlineUrl = "Enter a valid link (https://…)";
  } else if (v.onlineUrl && !isHttpUrl(v.onlineUrl)) {
    errors.onlineUrl = "Enter a valid link (https://…)";
  }

  if (v.organizerEmail && !z.string().email().safeParse(v.organizerEmail).success) {
    errors.organizerEmail = "Enter a valid email address";
  }

  let coverImage: string | null = null;
  if (v.coverImage) {
    if (!isCoverValue(v.coverImage)) {
      errors.coverImage = "Choose a cover design or use an https:// image link";
    } else {
      coverImage = v.coverImage;
    }
  }

  if (Object.keys(errors).length > 0 || !startsAt || !endsAt) {
    return { ok: false, fieldErrors: errors };
  }

  return {
    ok: true,
    data: {
      title: v.title,
      shortDescription: v.shortDescription,
      description: v.description,
      category: v.category,
      mode: v.mode,
      venue: v.venue,
      city: v.city,
      onlineUrl: v.onlineUrl,
      timezone: v.timezone,
      startsAt,
      endsAt,
      registrationOpensAt: opens,
      registrationClosesAt: closes,
      capacity,
      registrationEnabled: raw.registrationEnabled === "on",
      requiresApproval: raw.requiresApproval === "on",
      visibility: v.visibility,
      coverImage,
      organizerName: v.organizerName,
      organizerEmail: v.organizerEmail,
    },
  };
}

/** Whether an event may be published (stricter than saving a draft). */
export function publishBlockers(input: {
  title: string;
  shortDescription: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
}, now = new Date()): string[] {
  const problems: string[] = [];
  if (!input.title.trim()) problems.push("Add a title");
  if (input.shortDescription.trim().length < 10) problems.push("Add a short summary");
  if (input.endsAt.getTime() <= now.getTime()) {
    problems.push("The event has already ended — move the dates into the future");
  }
  return problems;
}
