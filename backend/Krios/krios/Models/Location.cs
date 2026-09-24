namespace Krios.Models.Krios
{
    public class Location
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string code { get; set; } = "";
        public string city { get; set; } = "";
        public string address { get; set; } = "";
        public string phone { get; set; } = "";
        public string email { get; set; } = "";
        public string timezone { get; set; } = "";
        public string status { get; set; } = "";
        public decimal lat { get; set; }
        public decimal lng { get; set; }
        public string placeId { get; set; } = "";
        public long googleRating { get; set; }
        public long googleReviewCount { get; set; }
        public string googleSyncedAt { get; set; } = "";
        public string googleMapsUrl { get; set; } = "";
        public string googleSyncSource { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class LocationSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class LocationDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}