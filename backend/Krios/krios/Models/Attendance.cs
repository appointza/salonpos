namespace Krios.Models.Krios
{
    public class Attendance
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public DateTime? date { get; set; }
        public string checkIn { get; set; } = "";
        public string checkOut { get; set; } = "";
        public string remarks { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long staffId { get; set; }
    }

    public class AttendanceSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class AttendanceDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}