import type { Row } from "@/lib/store";

/** How the discount is calculated. */
export const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage discount", example: "10% off" },
  { value: "fixed_amount", label: "Flat discount", example: "₹100 off" },
  { value: "slab_based", label: "Slab-based discount", example: "₹500–₹999 → ₹50 off" },
  { value: "flat_price", label: "Flat price", example: "Service at ₹499" },
  { value: "buy_x_get_y", label: "Buy X get Y", example: "Buy 2 get 1 free" },
  { value: "free_service", label: "Free service", example: "Free haircut" },
  { value: "free_addon", label: "Free add-on", example: "Free head massage" },
] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number]["value"];

/** What the coupon applies to. */
export const APPLIES_TO = [
  { value: "entire_bill", label: "Entire bill" },
  { value: "services", label: "Specific services" },
  { value: "categories", label: "Service categories" },
  { value: "products", label: "Retail products" },
  { value: "service_product", label: "Service + product combo" },
  { value: "membership", label: "Membership / package" },
  { value: "booking_fee", label: "Booking fee" },
] as const;

export type AppliesTo = (typeof APPLIES_TO)[number]["value"];

export const CUSTOMER_SEGMENTS = [
  { value: "all", label: "All customers" },
  { value: "new_customer", label: "New customer (first visit)" },
  { value: "existing_customer", label: "Existing / loyal customer" },
  { value: "first_purchase", label: "First purchase only" },
  { value: "birthday", label: "Birthday week" },
  { value: "anniversary", label: "Anniversary week" },
  { value: "vip", label: "VIP customer" },
  { value: "inactive", label: "Inactive (no visit N days)" },
  { value: "referral", label: "Referral reward" },
  { value: "gold", label: "Gold tier" },
  { value: "platinum", label: "Platinum tier" },
] as const;

export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number]["value"];

export const USAGE_LIMITS = [
  { value: "single_use", label: "Single use (total)" },
  { value: "per_customer", label: "Once per customer" },
  { value: "multi_use", label: "Multiple use" },
  { value: "limited_total", label: "Limited total — generate N unique codes" },
  { value: "daily", label: "Daily limit per customer" },
  { value: "weekly", label: "Weekly limit per customer" },
  { value: "monthly", label: "Monthly limit per customer" },
  { value: "unlimited", label: "Unlimited" },
] as const;

export type UsageLimitMode = (typeof USAGE_LIMITS)[number]["value"];

export const PAYMENT_METHODS = ["Any", "Cash", "UPI", "Card", "Wallet"] as const;

export const WEEKDAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
] as const;

export const COUPON_STATUSES = ["Draft", "Active", "Inactive", "Paused", "Expired"] as const;

export const COUPON_CODE_STATUSES = ["Available", "Issued", "Used", "Expired", "Cancelled"] as const;

export const COUPONS_COLLECTION = "coupons";
export const COUPON_REDEMPTIONS = "couponRedemptions";

/** Bill slab: minBill inclusive, maxBill inclusive (0 = no upper cap). */
export type DiscountSlab = {
  minBill: number;
  maxBill: number;
  discount: number;
};

export type CouponRule = {
  id: string;
  orgId: string;
  locationId: string;
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number;
  flatPrice: number;
  buyQty: number;
  freeQty: number;
  freeItemName: string;
  appliesTo: AppliesTo;
  targetIds: string;
  targetNames: string;
  minBillAmount: number;
  minQuantity: number;
  minBookingValue: number;
  customerSegment: CustomerSegment;
  targetCustomerId: string;
  discountSlabs: string;
  inactiveDays: number;
  staffId: string;
  paymentMethod: string;
  firstAppointmentOnly: string;
  advanceBookingDays: number;
  validityStart: string;
  validityEnd: string;
  validDays: string;
  validTimeStart: string;
  validTimeEnd: string;
  flashEndsAt: string;
  usageLimitMode: UsageLimitMode;
  totalUsageLimit: number;
  perCustomerLimit: number;
  usageCount: number;
  status: string;
  campaignTag: string;
  codePrefix: string;
  codeSuffix: string;
  codeStartNumber: number;
  codeLength: number;
  couponQuantity: number;
  autoGenerateCodes: string;
  eligibleLocationIds: string;
  allowWithOtherDiscounts: string;
  allowWithLoyalty: string;
  source: "coupons" | "qrOffers";
};

export function emptyCoupon(orgId: string, locationId: string): Row {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return {
    id: `CP-${suffix}`,
    orgId,
    locationId,
    code: `SAVE${suffix}`,
    codePrefix: "SAVE",
    codeSuffix: "",
    codeStartNumber: 1,
    codeLength: 4,
    couponQuantity: 100,
    autoGenerateCodes: "Yes",
    eligibleLocationIds: "",
    allowWithOtherDiscounts: "Yes",
    allowWithLoyalty: "Yes",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 10,
    maxDiscount: 0,
    flatPrice: 0,
    buyQty: 2,
    freeQty: 1,
    freeItemName: "service",
    appliesTo: "entire_bill",
    targetIds: "",
    targetNames: "",
    minBillAmount: 0,
    minQuantity: 0,
    minBookingValue: 0,
    customerSegment: "all",
    targetCustomerId: "",
    discountSlabs: "",
    inactiveDays: 90,
    staffId: "",
    paymentMethod: "Any",
    firstAppointmentOnly: "No",
    advanceBookingDays: 0,
    validityStart: new Date().toISOString().slice(0, 10),
    validityEnd: `${new Date().getFullYear()}-12-31`,
    validDays: "all",
    validTimeStart: "",
    validTimeEnd: "",
    flashEndsAt: "",
    usageLimitMode: "limited_total",
    totalUsageLimit: 100,
    perCustomerLimit: 1,
    usageCount: 0,
    status: "Draft",
    campaignTag: "",
  };
}
