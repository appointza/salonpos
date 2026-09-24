namespace Krios.Models.Krios
{
    public class Campaign
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string channel { get; set; } = "";
        public string segment { get; set; } = "";
        public long audience { get; set; }
        public long sent { get; set; }
        public long opened { get; set; }
        public long converted { get; set; }
        public decimal budget { get; set; }
        public string schedule { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class CampaignSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class CampaignDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}