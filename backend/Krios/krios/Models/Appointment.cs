namespace Krios.Models.Krios
{
    public class Appointment
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public long customerId { get; set; }
        public string customer { get; set; } = "";
        public long serviceId { get; set; }
        public string service { get; set; } = "";
        public long staffId { get; set; }
        public string staff { get; set; } = "";
        public string outlet { get; set; } = "";
        public DateTime? date { get; set; }
        public string time { get; set; } = "";
        public long duration { get; set; }
        public string status { get; set; } = "";
        public string source { get; set; } = "";
        public string notes { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class AppointmentSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class AppointmentDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}