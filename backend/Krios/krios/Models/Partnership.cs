namespace Krios.Models.Krios
{
    public class Partnership
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string partnerName { get; set; } = "";
        public string status { get; set; } = "";
        public string outboundOffer { get; set; } = "";
        public string inboundOffer { get; set; } = "";
        public long issued { get; set; }
        public long redeemed { get; set; }
    }

    public class PartnershipSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class PartnershipDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}