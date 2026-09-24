namespace Krios.Models.Krios
{
    public class ReferenceValue
    {
        public string referenceType { get; set; } = "";
        public long id { get; set; }
        public string name { get; set; } = "";
        public string value { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long orgId { get; set; }
        public long displayOrder { get; set; }
    }

    public class ReferenceValueSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class ReferenceValueDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}