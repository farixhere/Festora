/**
 * Built-in cover designs. They are rendered from CSS gradients + inline SVG,
 * so they can never break like a remote image URL. An event's cover_image is
 * either "art:<key>" (one of these) or an https:// URL (uploaded image).
 */
export type CoverArt = {
  key: string;
  label: string;
  from: string;
  via: string;
  to: string;
  motif: "burst" | "waves" | "dots" | "rings" | "tri";
};

export const COVER_ARTS: CoverArt[] = [
  { key: "violet-burst", label: "Violet burst", from: "#4c1d95", via: "#7c3aed", to: "#f97316", motif: "burst" },
  { key: "coral-waves", label: "Coral waves", from: "#be123c", via: "#fb7185", to: "#fdba74", motif: "waves" },
  { key: "midnight-dots", label: "Midnight dots", from: "#0f172a", via: "#312e81", to: "#7c3aed", motif: "dots" },
  { key: "sunset-rings", label: "Sunset rings", from: "#7c2d12", via: "#ea580c", to: "#fbbf24", motif: "rings" },
  { key: "teal-peaks", label: "Teal peaks", from: "#134e4a", via: "#0d9488", to: "#a3e635", motif: "tri" },
  { key: "magenta-burst", label: "Magenta burst", from: "#701a75", via: "#c026d3", to: "#fb923c", motif: "burst" },
];

export const DEFAULT_COVER_KEY = "violet-burst";

export function getCoverArt(key: string): CoverArt {
  return COVER_ARTS.find((c) => c.key === key) ?? COVER_ARTS[0]!;
}

export function isCoverValue(value: string): boolean {
  if (value.startsWith("art:")) {
    return COVER_ARTS.some((c) => c.key === value.slice(4));
  }
  try {
    const u = new URL(value);
    return u.protocol === "https:" && value.length <= 500;
  } catch {
    return false;
  }
}

/** Stable pseudo-random cover for events without one. */
export function fallbackCoverKey(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_ARTS[h % COVER_ARTS.length]!.key;
}
