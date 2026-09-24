namespace Krios.Models.Krios
{
    public class Feedback
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string customer { get; set; } = "";
        public string invoice { get; set; } = "";
        public string staff { get; set; } = "";
        public string outlet { get; set; } = "";
        public DateTime? date { get; set; }
        public long rating { get; set; }
        public long nps { get; set; }
        public string channel { get; set; } = "";
        public string status { get; set; } = "";
        public string comment { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class FeedbackSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class FeedbackDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}