export const PRIZE_TYPES = [
  "Percentage discount",
  "Flat discount",
  "Free service",
  "Bonus points",
  "Partner offer",
  "No prize",
] as const;

export type PrizeType = (typeof PRIZE_TYPES)[number];

export const PRIZE_TYPE_CHOICES: { value: PrizeType; label: string; example: string }[] = [
  { value: "Percentage discount", label: "% off", example: "Whole bill or one service" },
  { value: "Flat discount", label: "₹ off", example: "Whole bill or one service" },
  { value: "Free service", label: "Free treatment", example: "Like a free haircut" },
  { value: "Bonus points", label: "Gift points", example: "Like 50 loyalty points" },
  { value: "Partner offer", label: "Partner shop gift", example: "Like a café coupon" },
  { value: "No prize", label: "No gift this time", example: "Wheel says try again" },
];

export function prizeTypeLabel(type: string) {
  return PRIZE_TYPE_CHOICES.find((c) => c.value === type)?.label ?? type;
}

export function uniquePrizeCatalog<T extends { id?: unknown } & Record<string, unknown>>(rows: T[]): T[] {
  const seenId = new Set<string>();
  const seenFp = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "");
    if (id && seenId.has(id)) continue;
    const fp = [
      String(row["label"] ?? "").trim().toLowerCase(),
      String(row["prizeType"] ?? ""),
      String(Number(row["prizeValue"] ?? 0)),
      String(row["rewardTier"] ?? ""),
      String(Number(row["serviceId"] ?? 0)),
    ].join("|");
    if (seenFp.has(fp)) continue;
    if (id) seenId.add(id);
    seenFp.add(fp);
    out.push(row);
  }
  return out;
}

export function prizeNeedsNumber(type: string) {
  return type === "Percentage discount" || type === "Flat discount" || type === "Bonus points";
}

export function defaultPrizeValue(type: string): number {
  if (type === "Percentage discount") return 10;
  if (type === "Flat discount") return 100;
  if (type === "Bonus points") return 50;
  return 0;
}

export function prizeNeedsService(type: string) {
  return type === "Percentage discount" || type === "Flat discount" || type === "Free service";
}

export function autoPrizeLabel(type: string, value: number, serviceName: string) {
  const name = serviceName.trim();
  if (type === "Percentage discount") return name ? `${value}% off ${name}` : `${value}% off the bill`;
  if (type === "Flat discount") return name ? `₹${value} off ${name}` : `₹${value} off the bill`;
  if (type === "Free service") return name ? `Free ${name}` : "Free service";
  return "";
}

export function prizeValueHint(type: string) {
  if (type === "Percentage discount") {
    return {
      label: "How many percent off?",
      placeholder: "10",
      help: "Type 10 for 10% off. Pick one service below, or choose Whole bill.",
      suffix: "% off",
    };
  }
  if (type === "Flat discount") {
    return {
      label: "How many rupees off?",
      placeholder: "200",
      help: "Type 200 for ₹200 off. Pick one service below, or choose Whole bill.",
      suffix: "₹ off",
    };
  }
  if (type === "Bonus points") {
    return {
      label: "How many points to gift?",
      placeholder: "50",
      help: "Type 50 to add 50 loyalty points to the guest.",
      suffix: "points",
    };
  }
  if (type === "Free service") {
    return {
      label: "Which service is free?",
      placeholder: "",
      help: "Pick the service from your menu. We store that service’s id. POS claims it by id, even if you later rename the service.",
      suffix: "",
    };
  }
  if (type === "Partner offer") {
    return {
      label: "No number needed",
      placeholder: "",
      help: "Do not type a number. Put the partner gift in the name, like Free coffee at Café.",
      suffix: "",
    };
  }
  return {
    label: "No number needed",
    placeholder: "",
    help: "This slice is not a gift. Guests see Try again.",
    suffix: "",
  };
}

export function requirePrizeServiceId(row: { prizeType?: unknown; prizeValue?: unknown; serviceId?: unknown }) {
  const type = String(row["prizeType"] ?? "");
  const serviceId = Number(row["serviceId"] ?? 0) || (type === "Free service" ? Number(row["prizeValue"] ?? 0) : 0);
  if (type !== "Free service") return null;
  if (serviceId > 0) return null;
  return "Pick the service this gift applies to.";
}

export function formatPrizeValue(type: string, value: unknown, serviceName?: string) {
  const n = Number(value ?? 0);
  const name = String(serviceName ?? "").trim();
  if (type === "Percentage discount") return n > 0 ? (name ? `${n}% off ${name}` : `${n}% off the bill`) : "—";
  if (type === "Flat discount") return n > 0 ? (name ? `₹${n} off ${name}` : `₹${n} off the bill`) : "—";
  if (type === "Bonus points") return n > 0 ? `${n} points` : "—";
  if (type === "Free service") return name ? `Free ${name}` : n > 0 ? `Service ${n}` : "Pick a service";
  if (type === "Partner offer") return "Partner gift";
  if (type === "No prize") return "Try again";
  return n ? String(n) : "—";
}
