"use client";

import * as React from "react";

type Style = "datetime" | "date" | "relative";

function format(date: Date, style: Style, timeZone?: string): string {
  if (style === "date") {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone }).format(date);
  }
  if (style === "relative") {
    const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
    const abs = Math.abs(diffMin);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (abs < 60) return rtf.format(diffMin, "minute");
    if (abs < 60 * 24) return rtf.format(Math.round(diffMin / 60), "hour");
    if (abs < 60 * 24 * 30) return rtf.format(Math.round(diffMin / 1440), "day");
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(date);
}

/**
 * Shows a timestamp in the VIEWER's timezone. The server renders UTC first
 * (so markup is stable), then the browser swaps in local time after mount.
 */
export function LocalTime({ iso, style = "datetime" }: { iso: string; style?: Style }) {
  const date = React.useMemo(() => new Date(iso), [iso]);
  const [text, setText] = React.useState(() => `${format(date, style === "relative" ? "datetime" : style, "UTC")} UTC`);
  React.useEffect(() => {
    setText(format(date, style));
  }, [date, style]);
  return <time dateTime={iso}>{text}</time>;
}
