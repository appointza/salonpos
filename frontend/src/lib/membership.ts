import type { Row } from "@/lib/store";

type BillLine = { id: string; kind: string; name: string; price: number; qty: number };

export type MembershipBenefit = {
  amount: number;
  includedQty: number;
  notes: string[];
  usages: { serviceId: string; serviceName: string; quantity: number; type: string }[];
};

export function includedUsed(usage: Row[], membershipId: string) {
  return usage
    .filter((u) => String(u["membershipId"]) === membershipId && String(u["type"]) === "Included")
    .reduce((s, u) => s + Number(u["quantity"] ?? 0), 0);
}

const today = () => new Date().toISOString().slice(0, 10);

export function addCalendarMonths(isoDate: string, months: number) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function csvTokens(value: string | number | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[,+/&]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function haystack(line: BillLine, services: Row[]) {
  const svc = services.find((s) => String(s.id) === line.id);
  return `${line.name} ${line.kind} ${svc?.["name"] ?? ""} ${svc?.["category"] ?? ""} ${svc?.["type"] ?? ""}`.toLowerCase();
}

function matches(text: string, spec: string | number | undefined) {
  const keys = csvTokens(spec);
  return keys.length > 0 && keys.some((k) => text.includes(k));
}

export function isMembershipLive(mem: Row, on = today()) {
  if (String(mem["status"]) !== "Active") return false;
  const start = String(mem["startDate"] ?? "");
  const end = String(mem["endDate"] ?? "");
  if (start && on < start) return false;
  if (end && on > end) return false;
  return true;
}

export function findLiveMembership(
  memberships: Row[],
  customer: { name?: string; id?: string | number; membershipId?: string | number },
) {
  const membershipId = String(customer.membershipId ?? "");
  if (membershipId) {
    const byId = memberships.find((m) => String(m.id) === membershipId);
    if (byId && isMembershipLive(byId)) return byId;
  }
  const id = String(customer.id ?? "");
  return (
    memberships.find((m) => id && String(m["customerId"]) === id && isMembershipLive(m)) ?? null
  );
}

export function planForEnrollment(enrollment: Row, plans: Row[]) {
  const byId = plans.find((p) => String(p.id) === String(enrollment["planId"] ?? ""));
  if (byId) return byId;
  return plans.find((p) => String(p["name"]) === String(enrollment["plan"] ?? "")) ?? null;
}

/** Resolve a customer membershipId (enrollment id) to the plan name. */
export function membershipNameFromId(
  membershipId: string | number | undefined,
  memberships: Row[],
  plans: Row[],
) {
  const { enrollment, plan } = enrollmentAndPlan(membershipId, memberships, plans);
  if (!enrollment) return String(membershipId ?? "").trim();
  return String(plan?.["name"] ?? enrollment["plan"] ?? enrollment.id);
}

export function enrollmentAndPlan(
  membershipId: string | number | undefined,
  memberships: Row[],
  plans: Row[],
) {
  const id = String(membershipId ?? "").trim();
  if (!id) return { enrollment: null, plan: null };
  const enrollment = memberships.find((m) => String(m.id) === id) ?? null;
  return { enrollment, plan: enrollment ? planForEnrollment(enrollment, plans) : null };
}

function ruleValue(enrollment: Row, plan: Row | null, key: string) {
  const fromPlan = plan?.[key];
  const fromEnroll = enrollment[key];
  return fromPlan !== undefined && fromPlan !== "" ? fromPlan : fromEnroll;
}

/** Apply included visits (free), extra % off matching services, and retail % off products. */
export function applyMembershipBenefits(
  mem: Row | null,
  lines: BillLine[],
  services: Row[] = [],
  plans: Row[] = [],
  usage: Row[] = [],
): MembershipBenefit {
  if (!mem || !isMembershipLive(mem)) return { amount: 0, includedQty: 0, notes: [], usages: [] };
  const plan = planForEnrollment(mem, plans);

  const limit = Number(ruleValue(mem, plan, "includedLimit") ?? 0);
  const usedFromHistory = includedUsed(usage, String(mem.id));
  const hasHistory = usage.some((u) => String(u["membershipId"]) === String(mem.id));
  const used = hasHistory ? usedFromHistory : Number(mem["used"] ?? 0);
  let remaining = limit <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);
  const extraPct = Number(ruleValue(mem, plan, "extraDiscountPct") ?? 0);
  const retailPct = Number(ruleValue(mem, plan, "retailDiscountPct") ?? 0);
  const includedMatch = ruleValue(mem, plan, "includedMatch");
  const extraMatch = ruleValue(mem, plan, "extraDiscountMatch");

  let amount = 0;
  let includedQty = 0;
  const notes: string[] = [];
  const usages: MembershipBenefit["usages"] = [];

  for (const line of lines) {
    const text = haystack(line, services);
    const lineTotal = line.price * line.qty;

    if (line.kind === "product") {
      if (retailPct > 0) {
        const off = Math.round((lineTotal * retailPct) / 100);
        amount += off;
        if (off) notes.push(`${retailPct}% off ${line.name} (−₹${off.toLocaleString("en-IN")})`);
      }
      continue;
    }

    const isIncluded = matches(text, includedMatch);
    const isExtra = matches(text, extraMatch);

    if (isIncluded && remaining > 0) {
      const cover = Math.min(line.qty, remaining);
      const free = Math.round(line.price * cover);
      amount += free;
      includedQty += cover;
      remaining -= cover;
      usages.push({ serviceId: line.id, serviceName: line.name, quantity: cover, type: "Included" });
      notes.push(`${cover}× ${line.name} included (−₹${free.toLocaleString("en-IN")})`);
      const leftover = line.qty - cover;
      if (leftover > 0 && isExtra && extraPct > 0) {
        const off = Math.round((line.price * leftover * extraPct) / 100);
        amount += off;
        notes.push(`${extraPct}% off extra ${line.name} (−₹${off.toLocaleString("en-IN")})`);
      }
      continue;
    }

    if (isExtra && extraPct > 0) {
      const off = Math.round((lineTotal * extraPct) / 100);
      amount += off;
      if (off) notes.push(`${extraPct}% off ${line.name} (−₹${off.toLocaleString("en-IN")})`);
    }
  }

  return { amount: Math.round(amount), includedQty, notes, usages };
}

export function includedVisitProgress(mem: Row, plans: Row[], usage: Row[]) {
  const plan = planForEnrollment(mem, plans);
  const limit = Number(ruleValue(mem, plan, "includedLimit") ?? 0);
  const hasHistory = usage.some((u) => String(u["membershipId"]) === String(mem.id));
  const used = hasHistory ? includedUsed(usage, String(mem.id)) : Number(mem["used"] ?? 0);
  return {
    used,
    limit,
    remaining: limit <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
  };
}
