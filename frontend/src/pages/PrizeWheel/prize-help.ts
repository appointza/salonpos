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
  { value: "Percentage discount", label: "Percent off the bill", example: "Like 10% cheaper" },
  { value: "Flat discount", label: "Rupees off the bill", example: "Like ₹100 cheaper" },
  { value: "Free service", label: "Free treatment", example: "Like a free haircut" },
  { value: "Bonus points", label: "Gift points", example: "Like 50 loyalty points" },
  { value: "Partner offer", label: "Partner shop gift", example: "Like a café coupon" },
  { value: "No prize", label: "No gift this time", example: "Wheel says try again" },
];

export function prizeTypeLabel(type: string) {
  return PRIZE_TYPE_CHOICES.find((c) => c.value === type)?.label ?? type;
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

export function prizeValueHint(type: string) {
  if (type === "Percentage discount") {
    return {
      label: "How many percent off?",
      placeholder: "10",
      help: "Type 10 if the bill should be 10% cheaper. Type 20 for 20% off.",
      suffix: "% off",
    };
  }
  if (type === "Flat discount") {
    return {
      label: "How many rupees off?",
      placeholder: "100",
      help: "Type 100 if the guest gets ₹100 off the next bill.",
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

export function requirePrizeServiceId(row: { prizeType?: unknown; prizeValue?: unknown }) {
  if (String(row["prizeType"] ?? "") !== "Free service") return null;
  if (Number(row["prizeValue"] ?? 0) > 0) return null;
  return "Pick the free service. We save its id, not the name.";
}

export function formatPrizeValue(type: string, value: unknown) {
  const n = Number(value ?? 0);
  if (type === "Percentage discount") return n > 0 ? `${n}% off` : "—";
  if (type === "Flat discount") return n > 0 ? `₹${n} off` : "—";
  if (type === "Bonus points") return n > 0 ? `${n} points` : "—";
  if (type === "Free service") return n > 0 ? `Service id ${n}` : "Pick a service";
  if (type === "Partner offer") return "Partner gift";
  if (type === "No prize") return "Try again";
  return n ? String(n) : "—";
}
