namespace Krios.Models.Krios
{
    public class WheelSegment
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long programId { get; set; }
        public string label { get; set; } = "";
        public string rewardTier { get; set; } = "";
        public string prizeType { get; set; } = "";
        public long prizeValue { get; set; }
        public decimal winWeight { get; set; }
        public string colorHex { get; set; } = "";
        public string active { get; set; } = "";
    }

    public class WheelSegmentSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class WheelSegmentDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}