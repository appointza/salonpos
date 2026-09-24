namespace Krios.Models.Krios
{
    public class LoyaltyTransaction
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public long invoiceId { get; set; }
        public long programId { get; set; }
        public string type { get; set; } = "";
        public long points { get; set; }
        public string source { get; set; } = "";
        public long referenceId { get; set; }
        public decimal balanceBefore { get; set; }
        public decimal balanceAfter { get; set; }
        public string reason { get; set; } = "";
        public DateTime? expiresOn { get; set; }
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class LoyaltyTransactionSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class LoyaltyTransactionDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }

    public class LoyaltyPostPointsReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public string type { get; set; } = "";
        public long points { get; set; }
        public string source { get; set; } = "";
        public long referenceId { get; set; }
        public long invoiceId { get; set; }
        public long programId { get; set; }
        public DateTime? expiresOn { get; set; }
        public string reason { get; set; } = "";
    }

    public class LoyaltyPostPointsRes
    {
        public bool ok { get; set; }
        public bool duplicate { get; set; }
        public long balanceAfter { get; set; }
        public string errorMessage { get; set; } = "";
    }

    public class LoyaltyReversalReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public long invoiceId { get; set; }
        public string reason { get; set; } = "";
    }
}