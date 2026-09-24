namespace Krios.Models.Krios
{
    public class Organization
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string slug { get; set; } = "";
        public string domain { get; set; } = "";
        public string website { get; set; } = "";
        public string businessType { get; set; } = "";
        public string brandColor { get; set; } = "";
        public decimal pointsPerRupee { get; set; }
        public decimal rupeesPerPoint { get; set; }
        public string whatsappPhoneNumberId { get; set; } = "";
        public string whatsappBusinessAccountId { get; set; } = "";
        public string whatsappDisplayNumber { get; set; } = "";
        public string whatsappApiKey { get; set; } = "";
        public string whatsappWebhookToken { get; set; } = "";
        public string whatsappApiVersion { get; set; } = "";
        public string whatsappConnected { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public decimal earnUnitRupees { get; set; }
        public decimal pointsPerUnit { get; set; }
        public decimal loyaltyMinSpend { get; set; }
        public string rewardWheelWeights { get; set; } = "";
        public string rewardScratchWeights { get; set; } = "";
        public string rewardCustomerTierWeights { get; set; } = "";
        public string publicBookingShowPrizeWheel { get; set; } = "";
        public string publicBookingShowScratchCard { get; set; } = "";
    }

    public class OrganizationSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string slug { get; set; } = "";
        public string status { get; set; } = "";
        public string search { get; set; } = "";
    }

    public class OrganizationDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}
