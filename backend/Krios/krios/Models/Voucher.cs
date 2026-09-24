namespace Krios.Models.Krios
{
    public class Voucher
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long couponId { get; set; }
        public string code { get; set; } = "";
        public string voucherType { get; set; } = "";
        public decimal amount { get; set; }
        public string issueTo { get; set; } = "";
        public long customerId { get; set; }
        public long billId { get; set; }
        public long invoiceId { get; set; }
        public string status { get; set; } = "";
        public string unlimited { get; set; } = "";
        public string issuedAt { get; set; } = "";
        public string redeemedAt { get; set; } = "";
        public string schemeCode { get; set; } = "";
        public string schemeTitle { get; set; } = "";
        public long poolIndex { get; set; }
        public string poolGenerated { get; set; } = "";
        public decimal discountAmount { get; set; }
        public long redeemedLocationId { get; set; }
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class VoucherSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class VoucherDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}