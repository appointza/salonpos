namespace Krios.Models.Krios
{
    public class ServiceProduct
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long serviceId { get; set; }
        public string sku { get; set; } = "";
        public long skuId { get; set; }
        public decimal quantity { get; set; }
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class ServiceProductSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class ServiceProductDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}