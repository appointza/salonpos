namespace Krios.Models.Krios
{
    public class QrCheckin
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public string customer { get; set; } = "";
        public string phone { get; set; } = "";
        public long staffId { get; set; }
        public string staff { get; set; } = "";
        public decimal billAmount { get; set; }
        public string rewardEarned { get; set; } = "";
        public string verification { get; set; } = "";
        public string status { get; set; } = "";
        public string visitAt { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class QrCheckinSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class QrCheckinDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}