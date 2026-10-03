export const PRIZE_COLOURS = [
  { value: "#e11d48", label: "Rose" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Gold" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#a855f7", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#78716c", label: "Stone" },
] as const;

export type PrizeColour = (typeof PRIZE_COLOURS)[number];

export function prizeColourName(hex: string | number | undefined) {
  const value = String(hex ?? "").trim().toLowerCase();
  const hit = PRIZE_COLOURS.find((c) => c.value.toLowerCase() === value);
  return hit?.label ?? (value || "—");
}
