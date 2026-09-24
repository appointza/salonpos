namespace Krios.Models.Krios
{
    public class MembershipUsage
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public long membershipId { get; set; }
        public long planId { get; set; }
        public long invoiceId { get; set; }
        public long serviceId { get; set; }
        public string serviceName { get; set; } = "";
        public decimal quantity { get; set; }
        public string type { get; set; } = "";
        public string status { get; set; } = "";
        public DateTime? usedOn { get; set; }
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class MembershipUsageSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class MembershipUsageDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}