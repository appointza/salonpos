/** Remove all whitespace (leading, trailing, and internal spaces) from credential inputs. */
export function stripSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}

export function cleanEmail(value: string): string {
  return stripSpaces(value);
}

export function cleanIdentifier(value: string): string {
  return stripSpaces(value);
}

export function cleanPassword(value: string): string {
  return stripSpaces(value);
}

export function cleanOtp(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidEmail(value: string): boolean {
  const email = cleanEmail(value);
  return /^\S+@\S+\.\S+$/.test(email);
}
