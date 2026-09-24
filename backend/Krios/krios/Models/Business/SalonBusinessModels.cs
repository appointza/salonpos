namespace Krios.Models.Business
{
    public class BillLineDto
    {
        public long id { get; set; }
        public string kind { get; set; } = "service";
        public string name { get; set; } = "";
        public decimal price { get; set; }
        public decimal gstRate { get; set; }
        public int qty { get; set; } = 1;
        public decimal commission { get; set; }
        public string staff { get; set; } = "";
        public long staffId { get; set; }
    }

    public class RewardRefsDto
    {
        public long wheelSpinId { get; set; }
        public long offerRedemptionId { get; set; }
        public long partnerCouponId { get; set; }
    }

    public class PosQuoteReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public List<BillLineDto> lines { get; set; } = new();
        public decimal discount { get; set; }
        public long pointsRedeemed { get; set; }
        public string payment { get; set; } = "";
        public RewardRefsDto? rewards { get; set; }
        public List<string> couponCodes { get; set; } = new();
        public long staffId { get; set; }
    }

    public class PosCompleteSaleReq : PosQuoteReq
    {
        public long appointmentId { get; set; }
        public string outletName { get; set; } = "";
    }

    public class PosRefundReq
    {
        public long orgId { get; set; }
        public long invoiceId { get; set; }
        public string reason { get; set; } = "";
    }

    public class RewardDiscountLineDto
    {
        public string label { get; set; } = "";
        public decimal amount { get; set; }
    }

    public class AppliedCouponLineDto
    {
        public string code { get; set; } = "";
        public long couponId { get; set; }
        public string title { get; set; } = "";
        public decimal amount { get; set; }
    }

    public class CartQuoteDto
    {
        public decimal subtotal { get; set; }
        public decimal membershipDiscount { get; set; }
        public decimal rewardDiscount { get; set; }
        public List<RewardDiscountLineDto> rewardLines { get; set; } = new();
        public decimal couponDiscount { get; set; }
        public List<AppliedCouponLineDto> couponLines { get; set; } = new();
        public decimal otherDiscount { get; set; }
        public decimal loyaltyValue { get; set; }
        public decimal taxable { get; set; }
        public decimal tax { get; set; }
        public decimal total { get; set; }
        public long pointsToEarn { get; set; }
        public long pointsAfter { get; set; }
        public string? error { get; set; }
    }

    public class PosSaleResultDto
    {
        public long invoiceId { get; set; }
        public CartQuoteDto quote { get; set; } = new();
        public long earned { get; set; }
        public long pointsAfter { get; set; }
        public string? error { get; set; }
    }

    public class WheelSpinReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public long segmentId { get; set; }
        public string source { get; set; } = "public";
        public long checkinId { get; set; }
        public long programId { get; set; }
    }

    public class WheelSpinResultDto
    {
        public bool ok { get; set; }
        public bool duplicate { get; set; }
        public string label { get; set; } = "";
        public long spinId { get; set; }
        public long balanceAfter { get; set; }
        public string? error { get; set; }
    }

    public class ScratchPlayReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public long prizeId { get; set; }
        public string source { get; set; } = "public";
        public long checkinId { get; set; }
        public long programId { get; set; }
    }

    public class ScratchPlayResultDto
    {
        public bool ok { get; set; }
        public bool duplicate { get; set; }
        public string label { get; set; } = "";
        public long playId { get; set; }
        public long balanceAfter { get; set; }
        public string? error { get; set; }
    }

    public class AppointmentValidateReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long staffId { get; set; }
        public string staffName { get; set; } = "";
        public string date { get; set; } = "";
        public string time { get; set; } = "";
        public int duration { get; set; }
        public long serviceId { get; set; }
    }

    public class AppointmentActionReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long appointmentId { get; set; }
        public long invoiceId { get; set; }
        public string reason { get; set; } = "";
    }

    public class CouponValidateReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public string code { get; set; } = "";
        public List<BillLineDto> lines { get; set; } = new();
        public string paymentMethod { get; set; } = "Any";
        public long staffId { get; set; }
        public List<string> alreadyAppliedCodes { get; set; } = new();
    }

    public class CouponValidateResultDto
    {
        public bool ok { get; set; }
        public string code { get; set; } = "";
        public long couponId { get; set; }
        public string title { get; set; } = "";
        public decimal amount { get; set; }
        public string? reason { get; set; }
    }

    public class CustomerRewardsReq
    {
        public long orgId { get; set; }
        public long customerId { get; set; }
    }
}
