namespace Krios.Models.Krios
{
    public class Franchise
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string type { get; set; } = "";
        public string city { get; set; } = "";
        public string owner { get; set; } = "";
        public string phone { get; set; } = "";
        public string gstin { get; set; } = "";
        public decimal royalty { get; set; }
        public DateTime? goLive { get; set; }
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class FranchiseSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class FranchiseDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}