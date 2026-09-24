namespace Krios.Models.Krios
{
    public class PartnerCoupon
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long partnerId { get; set; }
        public long customerId { get; set; }
        public string direction { get; set; } = "";
        public string offer { get; set; } = "";
        public string couponCode { get; set; } = "";
        public string status { get; set; } = "";
        public string issuedAt { get; set; } = "";
        public string redeemedAt { get; set; } = "";
        public long invoiceId { get; set; }
    }

    public class PartnerCouponSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class PartnerCouponDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}