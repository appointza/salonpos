export function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}
