namespace Krios.Models.Krios
{
    public class Expense
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string category { get; set; } = "";
        public string vendor { get; set; } = "";
        public string outlet { get; set; } = "";
        public DateTime? date { get; set; }
        public decimal amount { get; set; }
        public string payment { get; set; } = "";
        public string status { get; set; } = "";
        public string approver { get; set; } = "";
        public string notes { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long skuId { get; set; }
        public string sku { get; set; } = "";
        public decimal quantity { get; set; }
        public string stockPosted { get; set; } = "";
    }

    public class ExpenseSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class ExpenseDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}