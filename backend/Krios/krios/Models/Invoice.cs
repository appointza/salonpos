namespace Krios.Models.Krios
{
    public class Invoice
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string customer { get; set; } = "";
        public string outlet { get; set; } = "";
        public DateTime? date { get; set; }
        public string items { get; set; } = "";
        public decimal subtotal { get; set; }
        public decimal discount { get; set; }
        public decimal gstRate { get; set; }
        public decimal tax { get; set; }
        public decimal total { get; set; }
        public string payment { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long customerId { get; set; }
        public long membershipId { get; set; }
    }

    public class InvoiceSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class InvoiceDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }

    public class InvoiceBillLine
    {
        public long id { get; set; }
        public string kind { get; set; } = "";
        public string name { get; set; } = "";
        public decimal price { get; set; }
        public decimal gstRate { get; set; }
        public long qty { get; set; }
        public decimal commission { get; set; }
        public string staff { get; set; } = "";
        public long staffId { get; set; }
    }

    public class InvoiceRewardRefs
    {
        public long wheelSpinId { get; set; }
        public long offerRedemptionId { get; set; }
        public long partnerCouponId { get; set; }
    }

    public class InvoiceQuoteReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public List<InvoiceBillLine> lines { get; set; } = new();
        public decimal discount { get; set; }
        public long pointsRedeemed { get; set; }
        public string payment { get; set; } = "";
        public InvoiceRewardRefs rewards { get; set; } = new();
        public List<string> couponCodes { get; set; } = new();
        public string outletName { get; set; } = "";
    }

    public class InvoiceDiscountLine
    {
        public string label { get; set; } = "";
        public decimal amount { get; set; }
    }

    public class InvoiceQuoteRes
    {
        public decimal subtotal { get; set; }
        public decimal membershipDiscount { get; set; }
        public decimal rewardDiscount { get; set; }
        public List<InvoiceDiscountLine> rewardLines { get; set; } = new();
        public decimal couponDiscount { get; set; }
        public decimal otherDiscount { get; set; }
        public decimal loyaltyValue { get; set; }
        public decimal taxable { get; set; }
        public decimal tax { get; set; }
        public decimal total { get; set; }
        public long pointsToEarn { get; set; }
        public long pointsRedeemApplied { get; set; }
        public long customerPoints { get; set; }
        public decimal rupeesPerPoint { get; set; }
        public long programId { get; set; }
        public long expiryMonths { get; set; }
        public string errorMessage { get; set; } = "";
    }

    public class InvoiceCompleteSaleReq : InvoiceQuoteReq
    {
        public long appointmentId { get; set; }
    }

    public class InvoiceCompleteSaleRes
    {
        public Invoice invoice { get; set; } = new();
        public InvoiceQuoteRes quote { get; set; } = new();
        public long pointsEarned { get; set; }
        public long pointsAfter { get; set; }
        public string errorMessage { get; set; } = "";
    }

    public class InvoiceRefundReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public string reason { get; set; } = "";
    }

    public class InvoiceRefundRes
    {
        public bool success { get; set; }
        public string errorMessage { get; set; } = "";
    }
}