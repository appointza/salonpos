namespace Krios.Models.Krios
{
    public class Loyalty
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string type { get; set; } = "";
        public string earnRate { get; set; } = "";
        public string redeemValue { get; set; } = "";
        public string tier { get; set; } = "";
        public decimal minSpend { get; set; }
        public long expiryMonths { get; set; }
        public string qrEnabled { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public decimal earnUnitRupees { get; set; }
        public decimal pointsPerUnit { get; set; }
        public decimal rupeesPerPoint { get; set; }
        public string rewardDescription { get; set; } = "";
        public long stampsRequired { get; set; }
        public string spinsAllowed { get; set; } = "";
        public string requiresCheckIn { get; set; } = "";
    }

    public class LoyaltySelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class LoyaltyDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}