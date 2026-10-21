/**
 * Timezone-safe date helpers.
 *
 * Events store instants (timestamptz). Organizers type wall-clock times in the
 * EVENT's timezone, so we convert "YYYY-MM-DDTHH:mm" <-> UTC using Intl only
 * (no external date library).
 */

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(utcMs: number, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour % 24,
    minute: out.minute,
    second: out.second,
  };
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function offsetMs(utcMs: number, timeZone: string): number {
  const p = zonedParts(utcMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Convert a wall-clock "YYYY-MM-DDTHH:mm" in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const m = LOCAL_RE.exec(local);
  if (!m || !isValidTimeZone(timeZone)) return null;
  const [, y, mo, d, h, mi] = m;
  const guess = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  // Reject impossible dates like 2026-02-31 (Date.UTC would roll over).
  const check = new Date(guess);
  if (
    check.getUTCFullYear() !== +y ||
    check.getUTCMonth() !== +mo - 1 ||
    check.getUTCDate() !== +d
  ) {
    return null;
  }
  let utc = guess - offsetMs(guess, timeZone);
  const second = guess - offsetMs(utc, timeZone);
  if (second !== utc) utc = second; // crossed a DST boundary
  return new Date(utc);
}

/** Format a UTC instant as "YYYY-MM-DDTHH:mm" wall-clock in `timeZone`. */
export function utcToZonedLocal(date: Date, timeZone: string): string {
  const p = zonedParts(date.getTime(), timeZone);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** "YYYY-MM-DD" key of an instant in `timeZone` (for grouping by day). */
export function zonedDayKey(date: Date, timeZone: string): string {
  return utcToZonedLocal(date, timeZone).slice(0, 10);
}

export function formatDate(
  date: Date,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone, ...opts }).format(date);
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateTime(date: Date, timeZone: string): string {
  return `${formatDate(date, timeZone)} · ${formatTime(date, timeZone)}`;
}

export function shortTimeZone(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** "Sat, 14 Mar 2026 · 10:00 am – 6:00 pm IST" (or two dates if multi-day). */
export function formatEventRange(
  startsAt: Date,
  endsAt: Date,
  timeZone: string,
): string {
  const sameDay = zonedDayKey(startsAt, timeZone) === zonedDayKey(endsAt, timeZone);
  const tz = shortTimeZone(startsAt, timeZone);
  if (sameDay) {
    return `${formatDate(startsAt, timeZone)} · ${formatTime(startsAt, timeZone)} – ${formatTime(endsAt, timeZone)} ${tz}`;
  }
  return `${formatDateTime(startsAt, timeZone)} → ${formatDateTime(endsAt, timeZone)} ${tz}`;
}

export function relativeDays(date: Date, now = new Date()): string {
  const diff = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Dhaka",
  "Asia/Colombo",
  "Asia/Kathmandu",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Tbilisi",
  "Europe/Vilnius",
  "Europe/Ljubljana",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;
