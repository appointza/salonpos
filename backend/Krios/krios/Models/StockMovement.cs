namespace Krios.Models.Krios
{
    public class StockMovement
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string sku { get; set; } = "";
        public long skuId { get; set; }
        public string skuName { get; set; } = "";
        public long customerId { get; set; }
        public long invoiceId { get; set; }
        public long expenseId { get; set; }
        public string type { get; set; } = "";
        public decimal quantity { get; set; }
        public decimal qtyIn { get; set; }
        public decimal qtyOut { get; set; }
        public DateTime? date { get; set; }
        public decimal balanceBefore { get; set; }
        public decimal balanceAfter { get; set; }
        public string reason { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class StockMovementSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class StockMovementDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}