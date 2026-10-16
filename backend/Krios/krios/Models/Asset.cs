namespace Krios.Models.Krios
{
    public class Asset
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string kind { get; set; } = "";
        public string mimeType { get; set; } = "";
        public string content { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class AssetSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string kind { get; set; } = "";
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class AssetDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}
