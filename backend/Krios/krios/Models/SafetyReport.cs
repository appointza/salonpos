namespace Krios.Models.Krios
{
    public class SafetySubmitReq
    {
        public long reporterId { get; set; }
        public string reporterContact { get; set; } = "";
        public long reportedUserId { get; set; }
        public string reportedContentId { get; set; } = "";
        public string reason { get; set; } = "";
        public string description { get; set; } = "";
        public string evidence { get; set; } = "";
    }

    public class SafetySubmitRes
    {
        public long reportId { get; set; }
        public string status { get; set; } = "open";
        public string message { get; set; } = "";
    }
}
