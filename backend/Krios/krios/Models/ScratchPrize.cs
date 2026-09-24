namespace Krios.Models.Krios
{
    public class ScratchPrize
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

    public class ScratchPrizeSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class ScratchPrizeDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}