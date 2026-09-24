/**
 * Generate frontend/src/services/*.service.ts — one class per Krios ApiController.
 * Run from frontend/: node scripts/generate-api-services.mjs
 */
import fs from "node:fs";
import path from "node:path";

const singularMap = {
  organizations: "Organization",
  locations: "Location",
  customers: "Customer",
  appointments: "Appointment",
  invoices: "Invoice",
  services: "Service",
  inventory: "Inventory",
  expenses: "Expense",
  staff: "Staff",
  shifts: "Shift",
  attendance: "Attendance",
  leaves: "Leave",
  payroll: "Payroll",
  commissions: "Commission",
  feedback: "Feedback",
  googleReviews: "GoogleReview",
  loyalty: "Loyalty",
  wheelSegments: "WheelSegment",
  wheelSpins: "WheelSpin",
  scratchPrizes: "ScratchPrize",
  scratchPlays: "ScratchPlay",
  qrCheckins: "QrCheckin",
  qrOffers: "QrOffer",
  partnerships: "Partnership",
  qrOfferRedemptions: "QrOfferRedemption",
  partnerCoupons: "PartnerCoupon",
  memberships: "Membership",
  campaigns: "Campaign",
  franchises: "Franchise",
  brandApps: "BrandApp",
  roles: "Role",
  users: "User",
  referenceValues: "ReferenceValue",
  membershipPlans: "MembershipPlan",
  loyaltyTransactions: "LoyaltyTransaction",
  membershipUsage: "MembershipUsage",
  stockMovements: "StockMovement",
  serviceProducts: "ServiceProduct",
  coupons: "Coupon",
  vouchers: "Voucher",
  vendors: "Vendor",
};

/** Extra POST endpoints beyond standard CRUD (matches ApiControllers). */
const extraEndpoints = {
  Invoice: [
    { method: "quote", action: "Quote", req: "InvoiceQuoteReq", res: "InvoiceQuoteRes" },
    { method: "completeSale", action: "CompleteSale", req: "InvoiceCompleteSaleReq", res: "InvoiceCompleteSaleRes" },
    { method: "refund", action: "Refund", req: "InvoiceRefundReq", res: "InvoiceRefundRes" },
  ],
  Coupon: [
    { method: "validateAtPos", action: "ValidateAtPos", req: "CouponValidateAtPosReq", res: "CouponValidateAtPosRes" },
    { method: "claimAtPos", action: "ClaimAtPos", req: "CouponClaimAtPosReq", res: "CouponClaimAtPosRes" },
  ],
  User: [
    { method: "login", action: "Login", req: "UserLoginReq", res: "UserLoginRes", skipAuth: true, login: true },
    { method: "updateProfile", action: "UpdateProfile", req: "UserProfileUpdateReq", res: "UserLoginRes" },
  ],
  Organization: [
    {
      method: "register",
      action: "Register",
      req: "OrganizationRegistrationReq",
      res: "OrganizationRegistrationRes",
      skipAuth: true,
    },
  ],
};

function serviceFileName(entity) {
  return `${entity.charAt(0).toLowerCase()}${entity.slice(1)}.service.ts`;
}

function serviceVarName(entity) {
  return `${entity.charAt(0).toLowerCase()}${entity.slice(1)}Service`;
}

function buildServiceFile(table, entity) {
  const resType = `${entity}Res`;
  const className = `${entity}Service`;
  const varName = serviceVarName(entity);
  const extras = extraEndpoints[entity] ?? [];

  const modelImports = new Set([resType]);
  for (const ep of extras) {
    modelImports.add(ep.req);
    modelImports.add(ep.res);
  }

  const lines = [
    `/** Auto-generated — run: node scripts/generate-api-services.mjs */`,
    `import { KriosBaseService } from "@/services/krios-base.service";`,
  ];

  if (entity === "User") {
    lines.push(`import { authTokenStore } from "@/utils/auth-token.util";`);
  }

  const sortedTypes = [...modelImports].sort();
  lines.push(`import type { ${sortedTypes.join(", ")} } from "@/model/${table}";`);
  lines.push(``);
  lines.push(`export class ${className} extends KriosBaseService<${resType}> {`);
  lines.push(`  constructor() {`);
  lines.push(`    super("${entity}");`);
  lines.push(`  }`);

  for (const ep of extras) {
    lines.push(``);
    if (ep.login) {
      lines.push(`  async ${ep.method}(req: ${ep.req}): Promise<${ep.res}> {`);
      lines.push(`    const res = await this.postAction<${ep.req}, ${ep.res}>("${ep.action}", req, true);`);
      lines.push(`    if (res.access_token && res.refresh_token) {`);
      lines.push(`      authTokenStore.set({`);
      lines.push(`        access_token: res.access_token,`);
      lines.push(`        refresh_token: res.refresh_token,`);
      lines.push(`        userId: res.userId,`);
      lines.push(`        userName: res.name,`);
      lines.push(`      });`);
      lines.push(`    }`);
      lines.push(`    return res;`);
      lines.push(`  }`);
    } else {
      const skip = ep.skipAuth ? ", true" : "";
      lines.push(`  async ${ep.method}(req: ${ep.req}): Promise<${ep.res}> {`);
      lines.push(`    return this.postAction<${ep.req}, ${ep.res}>("${ep.action}", req${skip});`);
      lines.push(`  }`);
    }
  }

  if (entity === "User") {
    lines.push(``);
    lines.push(`  logout() {`);
    lines.push(`    authTokenStore.clear();`);
    lines.push(`  }`);
  }

  lines.push(`}`);
  lines.push(``);
  lines.push(`export const ${varName} = new ${className}();`);
  lines.push(``);

  return lines.join("\n");
}

const servicesDir = path.resolve("src/services");
const generated = [];

for (const [table, entity] of Object.entries(singularMap)) {
  const file = path.join(servicesDir, serviceFileName(entity));
  fs.writeFileSync(file, buildServiceFile(table, entity));
  generated.push(file);
}

console.log(`Wrote ${generated.length} service files to ${servicesDir}`);
