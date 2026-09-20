import type { Row } from "@/lib/store";
import type { BillLine, CartQuote } from "@/lib/pos";
import type { AppliedCouponLine } from "@/lib/coupons/coupon-pos";
import type { RewardRefs } from "@/lib/rewards/reward-quote";

/** Store surface used by domain services (no React hooks). */
export type BusinessStore = {
  db: Record<string, Row[]>;
  create: (collection: string, row: Row, orgOverride?: string) => void;
  update: (collection: string, id: string, row: Row) => void;
};

export type TenantCtx = {
  orgId: string;
  locationId: string;
  outletName: string;
};

export type SaleCommand = {
  customer: Row;
  lines: BillLine[];
  discount: number;
  pointsRedeemed: number;
  payment: string;
  appointmentId?: string;
  rewards?: RewardRefs;
  couponCodes?: string[];
};

export type SaleResult = {
  invoice: Row | null;
  quote: CartQuote;
  earned: number;
  pointsAfter: number;
  error?: string;
};

export type UnifiedQuote = CartQuote & {
  couponDiscount: number;
  couponLines: AppliedCouponLine[];
};

export const BUSINESS_EVENTS = "businessEvents";

export type BusinessEventType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_CANCELLED"
  | "SALE_COMPLETED"
  | "INVOICE_REFUNDED"
  | "STOCK_CONSUMED"
  | "STOCK_ADJUSTED"
  | "STOCK_LOW"
  | "LOYALTY_EARNED"
  | "LOYALTY_REDEEMED";

export type BusinessEvent = {
  type: BusinessEventType;
  orgId: string;
  locationId: string;
  at: string;
  entityId: string;
  customerId?: string;
  payload?: Record<string, string | number>;
};
