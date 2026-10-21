import type { Event } from "@/lib/db/schema";
import { DEFAULT_COVER_KEY } from "@/lib/covers";
import { utcToZonedLocal } from "@/lib/utils/dates";

export type EventFormDefaults = {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  mode: string;
  venue: string;
  city: string;
  onlineUrl: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  capacity: string;
  registrationEnabled: boolean;
  requiresApproval: boolean;
  visibility: string;
  coverImage: string;
  organizerName: string;
  organizerEmail: string;
};

export function blankEventDefaults(organizerName: string, organizerEmail: string): EventFormDefaults {
  return {
    title: "",
    shortDescription: "",
    description: "",
    category: "",
    mode: "in_person",
    venue: "",
    city: "",
    onlineUrl: "",
    timezone: "Asia/Kolkata",
    startsAt: "",
    endsAt: "",
    registrationOpensAt: "",
    registrationClosesAt: "",
    capacity: "",
    registrationEnabled: true,
    requiresApproval: false,
    visibility: "public",
    coverImage: `art:${DEFAULT_COVER_KEY}`,
    organizerName,
    organizerEmail,
  };
}

/** Converts stored instants back into the wall-clock strings the form shows. */
export function eventToFormDefaults(e: Event): EventFormDefaults {
  const local = (d: Date | null) => (d ? utcToZonedLocal(d, e.timezone) : "");
  return {
    title: e.title,
    shortDescription: e.shortDescription,
    description: e.description,
    category: e.category,
    mode: e.mode,
    venue: e.venue,
    city: e.city,
    onlineUrl: e.onlineUrl,
    timezone: e.timezone,
    startsAt: local(e.startsAt),
    endsAt: local(e.endsAt),
    registrationOpensAt: local(e.registrationOpensAt),
    registrationClosesAt: local(e.registrationClosesAt),
    capacity: e.capacity === null ? "" : String(e.capacity),
    registrationEnabled: e.registrationEnabled,
    requiresApproval: e.requiresApproval,
    visibility: e.visibility,
    coverImage: e.coverImage ?? "",
    organizerName: e.organizerName,
    organizerEmail: e.organizerEmail,
  };
}
