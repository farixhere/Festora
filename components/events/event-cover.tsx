import { cn } from "@/lib/utils/cn";
import { fallbackCoverKey, getCoverArt, type CoverArt } from "@/lib/covers";

function Motif({ kind }: { kind: CoverArt["motif"] }) {
  const common = { fill: "none", stroke: "#fff", strokeOpacity: 0.28, strokeWidth: 1.5 } as const;
  switch (kind) {
    case "burst":
      return (
        <g {...common}>
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={300 + Math.cos(a) * 40}
                y1={120 + Math.sin(a) * 40}
                x2={300 + Math.cos(a) * 340}
                y2={120 + Math.sin(a) * 340}
              />
            );
          })}
          <circle cx="300" cy="120" r="34" fill="#fff" fillOpacity="0.16" stroke="none" />
        </g>
      );
    case "waves":
      return (
        <g {...common}>
          {Array.from({ length: 7 }).map((_, i) => (
            <path
              key={i}
              d={`M-20 ${70 + i * 26} Q 100 ${30 + i * 26} 220 ${70 + i * 26} T 460 ${70 + i * 26} T 700 ${70 + i * 26}`}
            />
          ))}
        </g>
      );
    case "dots":
      return (
        <g fill="#fff" fillOpacity="0.3">
          {Array.from({ length: 9 }).map((_, r) =>
            Array.from({ length: 22 }).map((__, c) => (
              <circle key={`${r}-${c}`} cx={14 + c * 28} cy={14 + r * 28} r={(r + c) % 5 === 0 ? 4 : 2} />
            )),
          )}
        </g>
      );
    case "rings":
      return (
        <g {...common}>
          {[30, 60, 90, 120, 150, 180].map((r) => (
            <circle key={r} cx="470" cy="190" r={r} />
          ))}
          <circle cx="470" cy="190" r="14" fill="#fff" fillOpacity="0.3" stroke="none" />
        </g>
      );
    case "tri":
      return (
        <g fill="#fff">
          <path d="M-10 260 L120 90 L250 260 Z" fillOpacity="0.14" />
          <path d="M140 260 L300 40 L460 260 Z" fillOpacity="0.2" />
          <path d="M360 260 L500 110 L640 260 Z" fillOpacity="0.12" />
        </g>
      );
  }
}

/**
 * Renders an event's cover: either an uploaded/linked image or one of the
 * built-in designs (which can never break or 404).
 */
export function EventCover({
  value,
  seed,
  className,
}: {
  value: string | null;
  /** Stable seed (slug/id) used to pick a design when there is no cover. */
  seed: string;
  className?: string;
}) {
  if (value && !value.startsWith("art:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  const art = getCoverArt(value ? value.slice(4) : fallbackCoverKey(seed));
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `linear-gradient(135deg, ${art.from} 0%, ${art.via} 55%, ${art.to} 100%)`,
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 600 240"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <Motif kind={art.motif} />
      </svg>
    </div>
  );
}
