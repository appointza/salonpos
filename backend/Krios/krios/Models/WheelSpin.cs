namespace Krios.Models.Krios
{
    public class WheelSpin
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public long programId { get; set; }
        public long segmentId { get; set; }
        public string rewardType { get; set; } = "";
        public long rewardValue { get; set; }
        public string label { get; set; } = "";
        public string source { get; set; } = "";
        public long referenceId { get; set; }
        public long checkinId { get; set; }
        public string status { get; set; } = "";
        public DateTime? createdAt { get; set; }
        public long loyaltyTransactionId { get; set; }
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class WheelSpinSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class WheelSpinDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}