namespace Krios.Models.Krios
{
    public class Staff
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string role { get; set; } = "";
        public string outlet { get; set; } = "";
        public string phone { get; set; } = "";
        public string email { get; set; } = "";
        public DateTime? joinDate { get; set; }
        public long baseSalary { get; set; }
        public decimal commissionRate { get; set; }
        public long target { get; set; }
        public string status { get; set; } = "";
        public string address { get; set; } = "";
        public string bankName { get; set; } = "";
        public string bankAccount { get; set; } = "";
        public string bankIfsc { get; set; } = "";
        public string idProofType { get; set; } = "";
        public string idProofRef { get; set; } = "";
        public string addressProofType { get; set; } = "";
        public string addressProofRef { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class StaffSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class StaffDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}