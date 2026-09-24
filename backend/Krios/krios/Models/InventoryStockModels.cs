namespace Krios.Models.Krios
{
    public class InventoryRemainingReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long skuId { get; set; }
    }

    public class InventoryRemainingRow
    {
        public long skuId { get; set; }
        public decimal remaining { get; set; }
    }

    public class InventoryRemainingRes
    {
        public List<InventoryRemainingRow> rows { get; set; } = new();
        public string errorMessage { get; set; } = "";
    }

    public class InventoryAvailabilityLine
    {
        public long id { get; set; }
        public string kind { get; set; } = "";
        public string name { get; set; } = "";
        public long qty { get; set; }
    }

    public class InventoryCheckAvailabilityReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public List<InventoryAvailabilityLine> lines { get; set; } = new();
    }

    public class InventoryMissingProduct
    {
        public long skuId { get; set; }
        public string name { get; set; } = "";
        public decimal need { get; set; }
        public decimal have { get; set; }
    }

    public class InventoryCheckAvailabilityRes
    {
        public bool ok { get; set; }
        public string errorMessage { get; set; } = "";
        public List<InventoryMissingProduct> missing { get; set; } = new();
    }

    public class StockAdjustReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long skuId { get; set; }
        public decimal quantity { get; set; }
        public string direction { get; set; } = "in";
        public string reason { get; set; } = "";
        public DateTime? date { get; set; }
    }

    public class StockAdjustRes
    {
        public bool ok { get; set; }
        public string errorMessage { get; set; } = "";
        public StockMovement movement { get; set; } = new();
        public decimal remainingAfter { get; set; }
    }

    public class InventoryIssueForSaleReq
    {
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public long invoiceId { get; set; }
        public DateTime? date { get; set; }
        public List<InventoryAvailabilityLine> lines { get; set; } = new();
    }
}
