namespace Krios.Models.Krios
{
    public class Payroll
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string period { get; set; } = "";
        public decimal incentive { get; set; }
        public string status { get; set; } = "";
        public DateTime? payDate { get; set; }
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long staffId { get; set; }
        public long extraDeductions { get; set; }
    }

    public class PayrollSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class PayrollDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}