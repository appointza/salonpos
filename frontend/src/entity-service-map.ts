import type { KriosBaseService } from "@/services/krios-base.service";
import { appointmentService } from "@/services/appointment.service";
import { attendanceService } from "@/services/attendance.service";
import { brandAppService } from "@/services/brandApp.service";
import { campaignService } from "@/services/campaign.service";
import { commissionService } from "@/services/commission.service";
import { couponService } from "@/services/coupon.service";
import { customerService } from "@/services/customer.service";
import { expenseService } from "@/services/expense.service";
import { feedbackService } from "@/services/feedback.service";
import { franchiseService } from "@/services/franchise.service";
import { googleReviewService } from "@/services/googleReview.service";
import { inventoryService } from "@/services/inventory.service";
import { invoiceService } from "@/services/invoice.service";
import { leaveService } from "@/services/leave.service";
import { locationService } from "@/services/location.service";
import { loyaltyService } from "@/services/loyalty.service";
import { loyaltyTransactionService } from "@/services/loyaltyTransaction.service";
import { membershipService } from "@/services/membership.service";
import { membershipPlanService } from "@/services/membershipPlan.service";
import { membershipUsageService } from "@/services/membershipUsage.service";
import { organizationService } from "@/services/organization.service";
import { partnerCouponService } from "@/services/partnerCoupon.service";
import { partnershipService } from "@/services/partnership.service";
import { payrollService } from "@/services/payroll.service";
import { qrCheckinService } from "@/services/qrCheckin.service";
import { qrOfferService } from "@/services/qrOffer.service";
import { qrOfferRedemptionService } from "@/services/qrOfferRedemption.service";
import { referenceValueService } from "@/services/referenceValue.service";
import { roleService } from "@/services/role.service";
import { scratchPlayService } from "@/services/scratchPlay.service";
import { scratchPrizeService } from "@/services/scratchPrize.service";
import { serviceService } from "@/services/service.service";
import { serviceProductService } from "@/services/serviceProduct.service";
import { shiftService } from "@/services/shift.service";
import { staffService } from "@/services/staff.service";
import { stockMovementService } from "@/services/stockMovement.service";
import { userService } from "@/services/user.service";
import { vendorService } from "@/services/vendor.service";
import { voucherService } from "@/services/voucher.service";
import { wheelSegmentService } from "@/services/wheelSegment.service";
import { wheelSpinService } from "@/services/wheelSpin.service";

/** Collection key → Krios API service */
export const ENTITY_SERVICE_MAP: Record<string, KriosBaseService<{ id?: number }>> = {
  organizations: organizationService,
  locations: locationService,
  customers: customerService,
  appointments: appointmentService,
  invoices: invoiceService,
  services: serviceService,
  inventory: inventoryService,
  expenses: expenseService,
  staff: staffService,
  shifts: shiftService,
  attendance: attendanceService,
  leaves: leaveService,
  payroll: payrollService,
  commissions: commissionService,
  feedback: feedbackService,
  googleReviews: googleReviewService,
  loyalty: loyaltyService,
  wheelSegments: wheelSegmentService,
  wheelSpins: wheelSpinService,
  scratchPrizes: scratchPrizeService,
  scratchPlays: scratchPlayService,
  qrCheckins: qrCheckinService,
  qrOffers: qrOfferService,
  partnerships: partnershipService,
  qrOfferRedemptions: qrOfferRedemptionService,
  partnerCoupons: partnerCouponService,
  memberships: membershipService,
  campaigns: campaignService,
  franchises: franchiseService,
  brandApps: brandAppService,
  roles: roleService,
  users: userService,
  referenceValues: referenceValueService,
  membershipPlans: membershipPlanService,
  loyaltyTransactions: loyaltyTransactionService,
  membershipUsage: membershipUsageService,
  stockMovements: stockMovementService,
  serviceProducts: serviceProductService,
  coupons: couponService,
  vouchers: voucherService,
  vendors: vendorService,
};

export const API_COLLECTION_KEYS = Object.keys(ENTITY_SERVICE_MAP);
