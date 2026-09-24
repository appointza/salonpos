namespace Krios.Models.Krios
{
    public class Membership
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string plan { get; set; } = "";
        public string startDate { get; set; } = "";
        public string endDate { get; set; } = "";
        public long used { get; set; }
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long planId { get; set; }
        public long customerId { get; set; }
    }

    public class MembershipSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class MembershipDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}