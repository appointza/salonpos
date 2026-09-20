export function formatDate(value: string | Date, locale = "en-IN") {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}
