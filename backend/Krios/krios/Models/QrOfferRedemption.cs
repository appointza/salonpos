namespace Krios.Models.Krios
{
    public class QrOfferRedemption
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long offerId { get; set; }
        public long customerId { get; set; }
        public long checkinId { get; set; }
        public long invoiceId { get; set; }
        public string status { get; set; } = "";
        public decimal discountAmount { get; set; }
        public string issuedAt { get; set; } = "";
        public string redeemedAt { get; set; } = "";
        public string offerTitle { get; set; } = "";
        public string offerType { get; set; } = "";
    }

    public class QrOfferRedemptionSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class QrOfferRedemptionDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}