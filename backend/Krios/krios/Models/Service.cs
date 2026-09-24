namespace Krios.Models.Krios
{
    public class Service
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string category { get; set; } = "";
        public long duration { get; set; }
        public decimal price { get; set; }
        public decimal gstRate { get; set; }
        public decimal commission { get; set; }
        public string outlet { get; set; } = "";
        public string active { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public string type { get; set; } = "";
        public string comboItems { get; set; } = "";
        public string productNeeds { get; set; } = "";
    }

    public class ServiceSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class ServiceDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}