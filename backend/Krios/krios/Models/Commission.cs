namespace Krios.Models.Krios
{
    public class Commission
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string type { get; set; } = "";
        public decimal baseAmount { get; set; }
        public decimal rate { get; set; }
        public decimal amount { get; set; }
        public DateTime? date { get; set; }
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long staffId { get; set; }
        public long invoiceId { get; set; }
        public long serviceId { get; set; }
        public string item { get; set; } = "";
    }

    public class CommissionSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class CommissionDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}