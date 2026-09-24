namespace Krios.Models.Krios
{
    public class GoogleReview
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string outlet { get; set; } = "";
        public string author { get; set; } = "";
        public long rating { get; set; }
        public string relativeTime { get; set; } = "";
        public DateTime? date { get; set; }
        public string comment { get; set; } = "";
        public string source { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class GoogleReviewSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class GoogleReviewDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}