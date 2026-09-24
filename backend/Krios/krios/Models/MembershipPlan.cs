namespace Krios.Models.Krios
{
    public class MembershipPlan
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public decimal price { get; set; }
        public long validityMonths { get; set; }
        public string benefits { get; set; } = "";
        public string includedMatch { get; set; } = "";
        public long includedLimit { get; set; }
        public string extraDiscountMatch { get; set; } = "";
        public decimal extraDiscountPct { get; set; }
        public decimal retailDiscountPct { get; set; }
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class MembershipPlanSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class MembershipPlanDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}