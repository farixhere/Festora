import { cn } from "@/lib/utils/cn";

/**
 * Festora mark: a spark/starburst (celebration) built from a rounded square
 * badge. Pure SVG, scales crisply and respects the current theme tokens.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-9 w-9", className)}
      role="img"
      aria-label="Festora"
    >
      <defs>
        <linearGradient id="festora-g" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.6" stopColor="#a855f7" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#festora-g)" />
      {/* four-point spark */}
      <path
        d="M20 7.5c.9 6.4 3.6 9.1 10 10-6.4.9-9.1 3.6-10 10-.9-6.4-3.6-9.1-10-10 6.4-.9 9.1-3.6 10-10Z"
        fill="#fff"
      />
      {/* small satellite spark */}
      <path
        d="M31.5 24.5c.35 2.3 1.2 3.15 3.5 3.5-2.3.35-3.15 1.2-3.5 3.5-.35-2.3-1.2-3.15-3.5-3.5 2.3-.35 3.15-1.2 3.5-3.5Z"
        fill="#fff"
        opacity="0.85"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight">
          Festora
        </span>
      )}
    </span>
  );
}
