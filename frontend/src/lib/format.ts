// Small display helpers. Timestamps come back as epoch-ms integers.

export function fmtDate(epochMs: number | null | undefined): string {
  if (!epochMs && epochMs !== 0) return "—";
  return new Date(epochMs).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(epochMs: number | null | undefined): string {
  if (!epochMs && epochMs !== 0) return "—";
  return new Date(epochMs).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtDays(n: number): string {
  return `${n.toLocaleString()} day${n === 1 ? "" : "s"}`;
}
