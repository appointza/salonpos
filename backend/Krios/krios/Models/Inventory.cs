namespace Krios.Models.Krios
{
    public class Inventory
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string category { get; set; } = "";
        public string brand { get; set; } = "";
        public string outlet { get; set; } = "";
        public long stock { get; set; }
        public long reorderLevel { get; set; }
        public decimal unitCost { get; set; }
        public decimal sellPrice { get; set; }
        public string batch { get; set; } = "";
        public DateTime? expiry { get; set; }
        public long vendorId { get; set; }
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class InventorySelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class InventoryDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}