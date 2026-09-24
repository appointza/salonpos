namespace Krios.Models.Krios
{
    public class BrandApp
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string outlet { get; set; } = "";
        public string appName { get; set; } = "";
        public string primaryColor { get; set; } = "";
        public string bundleId { get; set; } = "";
        public string platform { get; set; } = "";
        public string version { get; set; } = "";
        public string website { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class BrandAppSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class BrandAppDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}