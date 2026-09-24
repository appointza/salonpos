namespace Krios.Models.Krios
{
    public class QrOffer
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string title { get; set; } = "";
        public string description { get; set; } = "";
        public string offerType { get; set; } = "";
        public string eligibleSegment { get; set; } = "";
        public DateTime? validityStart { get; set; }
        public DateTime? validityEnd { get; set; }
        public string status { get; set; } = "";
        public decimal buyQty { get; set; }
        public decimal freeQty { get; set; }
        public string serviceName { get; set; } = "";
    }

    public class QrOfferSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class QrOfferDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}