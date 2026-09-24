namespace Krios.Models.Krios
{
    public class Vendor
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string contact { get; set; } = "";
        public string phone { get; set; } = "";
        public string email { get; set; } = "";
        public string gstin { get; set; } = "";
        public string outlet { get; set; } = "";
        public string category { get; set; } = "";
        public string status { get; set; } = "";
        public string notes { get; set; } = "";
        public DateTime? createdon { get; set; }
    }

    public class VendorSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class VendorDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}