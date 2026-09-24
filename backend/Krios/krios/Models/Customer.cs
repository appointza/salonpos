namespace Krios.Models.Krios
{
    public class Customer
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string phone { get; set; } = "";
        public string email { get; set; } = "";
        public string gender { get; set; } = "";
        public DateTime? birthday { get; set; }
        public DateTime? anniversary { get; set; }
        public string household { get; set; } = "";
        public string tier { get; set; } = "";
        public long points { get; set; }
        public decimal walletBalance { get; set; }
        public string outlet { get; set; } = "";
        public DateTime? lastVisit { get; set; }
        public string notes { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long membershipId { get; set; }
        public long stampsCurrent { get; set; }
        public decimal totalVisits { get; set; }
        public string referralCode { get; set; } = "";
        public string marketingConsent { get; set; } = "";
    }

    public class CustomerSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class CustomerDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }

    public class CustomerLoyaltySummaryReq
    {
        public long orgId { get; set; }
        public long customerId { get; set; }
    }

    public class CustomerLoyaltySummaryRes
    {
        public long points { get; set; }
        public long earned { get; set; }
        public long redeemed { get; set; }
        public List<LoyaltyTransaction> transactions { get; set; } = new();
        public string errorMessage { get; set; } = "";
    }
}