namespace Krios.Models.Krios
{
    public class Coupon
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string code { get; set; } = "";
        public string codePrefix { get; set; } = "";
        public string codeSuffix { get; set; } = "";
        public long codeStartNumber { get; set; }
        public long codeLength { get; set; }
        public decimal couponQuantity { get; set; }
        public string autoGenerateCodes { get; set; } = "";
        public string eligibleLocationIds { get; set; } = "";
        public string allowWithOtherDiscounts { get; set; } = "";
        public string allowWithLoyalty { get; set; } = "";
        public string title { get; set; } = "";
        public string description { get; set; } = "";
        public string discountType { get; set; } = "";
        public decimal discountValue { get; set; }
        public decimal maxDiscount { get; set; }
        public decimal flatPrice { get; set; }
        public decimal buyQty { get; set; }
        public decimal freeQty { get; set; }
        public string freeItemName { get; set; } = "";
        public string appliesTo { get; set; } = "";
        public string targetIds { get; set; } = "";
        public string targetNames { get; set; } = "";
        public decimal minBillAmount { get; set; }
        public decimal minQuantity { get; set; }
        public decimal minBookingValue { get; set; }
        public string customerSegment { get; set; } = "";
        public long targetCustomerId { get; set; }
        public string discountSlabs { get; set; } = "";
        public long inactiveDays { get; set; }
        public long staffId { get; set; }
        public string paymentMethod { get; set; } = "";
        public string firstAppointmentOnly { get; set; } = "";
        public long advanceBookingDays { get; set; }
        public DateTime? validityStart { get; set; }
        public DateTime? validityEnd { get; set; }
        public string validDays { get; set; } = "";
        public string validTimeStart { get; set; } = "";
        public string validTimeEnd { get; set; } = "";
        public string flashEndsAt { get; set; } = "";
        public string usageLimitMode { get; set; } = "";
        public decimal totalUsageLimit { get; set; }
        public long perCustomerLimit { get; set; }
        public long usageCount { get; set; }
        public string status { get; set; } = "";
        public string campaignTag { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class CouponSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class CouponDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }

    public class CouponCartLine
    {
        public long id { get; set; }
        public string kind { get; set; } = "";
        public string category { get; set; } = "";
        public string name { get; set; } = "";
        public decimal price { get; set; }
        public long qty { get; set; }
    }

    public class CouponValidateAtPosReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public string code { get; set; } = "";
        public List<CouponCartLine> lines { get; set; } = new();
        public string paymentMethod { get; set; } = "";
        public List<long> alreadyAppliedCouponIds { get; set; } = new();
    }

    public class CouponValidateAtPosRes
    {
        public bool ok { get; set; }
        public string reason { get; set; } = "";
        public long couponId { get; set; }
        public string code { get; set; } = "";
        public string title { get; set; } = "";
        public decimal amount { get; set; }
        public decimal eligibleSubtotal { get; set; }
    }

    public class CouponClaimAtPosReq
    {
        public long orgId { get; set; }
        public long couponId { get; set; }
        public long customerId { get; set; }
        public long invoiceId { get; set; }
        public decimal discountAmount { get; set; }
    }

    public class CouponClaimAtPosRes
    {
        public bool success { get; set; }
        public string errorMessage { get; set; } = "";
    }
}