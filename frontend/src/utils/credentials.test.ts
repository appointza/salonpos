import { describe, expect, it } from "vitest";
import { cleanEmail, cleanIdentifier, cleanOtp, cleanPassword, isValidEmail, stripSpaces } from "./credentials";

describe("credentials normalization", () => {
  it("strips leading, trailing, and internal whitespace", () => {
    expect(stripSpaces("  hello   world \t\n ")).toBe("helloworld");
    expect(cleanEmail("  owner @salon.com ")).toBe("owner@salon.com");
    expect(cleanIdentifier(" 98765 43210 ")).toBe("9876543210");
    expect(cleanIdentifier("  admin@krios.in  ")).toBe("admin@krios.in");
    expect(cleanPassword("  Pass 123  ")).toBe("Pass123");
  });

  it("extracts digits for OTP codes", () => {
    expect(cleanOtp(" 123 456 ")).toBe("123456");
    expect(cleanOtp("12-34-56")).toBe("123456");
  });

  it("validates email after stripping stray spaces", () => {
    expect(isValidEmail(" user@salon.com ")).toBe(true);
    expect(isValidEmail("user @salon.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
  });
});
