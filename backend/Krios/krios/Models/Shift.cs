namespace Krios.Models.Krios
{
    public class Shift
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public DateTime? date { get; set; }
        public string startTime { get; set; } = "";
        public string endTime { get; set; } = "";
        public string shiftType { get; set; } = "";
        public string weeklyOff { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
        public long staffId { get; set; }
    }

    public class ShiftSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class ShiftDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}