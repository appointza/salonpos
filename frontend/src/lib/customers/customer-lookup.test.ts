import { describe, expect, it } from "vitest";
import {
  customersForOutlet,
  findCustomerByPhone,
  hasDuplicatePhoneAtOutlet,
  normalizePhone,
} from "@/lib/customers/customer-lookup";
import {
  FIXTURE_ORG_ID,
  FIXTURE_OUTLET_A,
  FIXTURE_OUTLET_B,
  FIXTURE_PHONE,
  fixtureCustomers,
} from "@/lib/business/business-fixtures";

describe("customer scoping (org + outlet)", () => {
  it("normalizes phone to last 10 digits", () => {
    expect(normalizePhone("+91 98765-43210")).toBe(FIXTURE_PHONE);
  });

  it("lists customers for one outlet only", () => {
    const atA = customersForOutlet(fixtureCustomers, FIXTURE_ORG_ID, FIXTURE_OUTLET_A);
    expect(atA).toHaveLength(1);
    expect(atA[0]?.id).toBe(101);

    const atB = customersForOutlet(fixtureCustomers, FIXTURE_ORG_ID, FIXTURE_OUTLET_B);
    expect(atB).toHaveLength(1);
    expect(atB[0]?.id).toBe(102);
  });

  it("same phone at two outlets returns different profiles", () => {
    const atA = findCustomerByPhone(fixtureCustomers, FIXTURE_PHONE, FIXTURE_OUTLET_A);
    const atB = findCustomerByPhone(fixtureCustomers, FIXTURE_PHONE, FIXTURE_OUTLET_B);
    expect(atA?.id).toBe(101);
    expect(atB?.id).toBe(102);
    expect(atA?.id).not.toBe(atB?.id);
  });

  it("does not match customer from another organisation", () => {
    const match = findCustomerByPhone(fixtureCustomers, FIXTURE_PHONE, 20);
    expect(match?.orgId).toBe(2);
    expect(match?.id).toBe(201);
  });

  it("detects duplicate phone within same outlet", () => {
    expect(
      hasDuplicatePhoneAtOutlet(fixtureCustomers, FIXTURE_PHONE, FIXTURE_ORG_ID, FIXTURE_OUTLET_A),
    ).toBe(true);
    expect(
      hasDuplicatePhoneAtOutlet(fixtureCustomers, FIXTURE_PHONE, FIXTURE_ORG_ID, FIXTURE_OUTLET_A, 101),
    ).toBe(false);
    expect(
      hasDuplicatePhoneAtOutlet(fixtureCustomers, "9000000000", FIXTURE_ORG_ID, FIXTURE_OUTLET_A),
    ).toBe(false);
  });
});
