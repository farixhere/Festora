export const EVENT_CATEGORIES = [
  "Cultural",
  "Technical",
  "Workshop",
  "Conference",
  "Competition",
  "Sports",
  "Music",
  "Networking",
  "Community",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_MODES = [
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
] as const;

export const APP_NAME = "Festora";
export const APP_TAGLINE = "Run every event from one beautiful dashboard.";

export const PAGE_SIZE = 12;
export const TABLE_PAGE_SIZE = 20;
