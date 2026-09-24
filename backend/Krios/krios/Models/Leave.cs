namespace Krios.Models.Krios
{
    public class Leave
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string type { get; set; } = "";
        public DateTime? fromDate { get; set; }
        public DateTime? toDate { get; set; }
        public string status { get; set; } = "";
        public string approver { get; set; } = "";
        public string reason { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long staffId { get; set; }
        public long days { get; set; }
    }

    public class LeaveSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class LeaveDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}