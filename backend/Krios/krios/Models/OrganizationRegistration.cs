namespace Krios.Models.Krios
{
    public class OrganizationRegistrationReq
    {
        public string organizationName { get; set; } = "";
        public string businessType { get; set; } = "";
        public string domain { get; set; } = "";
        public string website { get; set; } = "";
        public string brandColor { get; set; } = "";
        public string adminName { get; set; } = "";
        public string adminEmail { get; set; } = "";
        public string adminPassword { get; set; } = "";
        public string phone { get; set; } = "";
        public string city { get; set; } = "";
        public string address { get; set; } = "";
        public string outletName { get; set; } = "";
    }

    public class OrganizationRegistrationRes
    {
        public long organizationId { get; set; }
        public long adminUserId { get; set; }
        public long locationId { get; set; }
        public string slug { get; set; } = "";
    }
}
