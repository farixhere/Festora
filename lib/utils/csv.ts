/**
 * CSV helpers. Cells that start with a formula trigger (= + - @ tab CR) are
 * prefixed with an apostrophe so spreadsheet apps never execute participant
 * input as a formula (CSV injection).
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 names correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
