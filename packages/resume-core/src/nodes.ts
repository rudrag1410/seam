import type { Resume } from "./ast";

export function nodeText(doc: Resume, id: string): string | undefined {
  for (const s of doc.sections) {
    if (s.type === "summary" && s.id === id) return s.text;
    if ("items" in s) {
      for (const item of s.items) {
        const found = "bullets" in item ? item.bullets.find((b) => b.id === id) : undefined;
        if (found) return found.text;
      }
    }
  }
  return undefined;
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  if (/^(present|current|now)$/i.test(value)) return "Present";
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[Number(m[2]) - 1]} ${m[1]}`;
}

export function dateRange(start?: string | null, end?: string | null): string {
  const s = formatDate(start);
  const e = formatDate(end);
  return s && e ? `${s} – ${e}` : s || e;
}
