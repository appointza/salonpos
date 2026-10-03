export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function maskPhone(value: string): string {
  const n = normalizePhone(value);
  if (n.length < 4) return "****";
  return `******${n.slice(-4)}`;
}
