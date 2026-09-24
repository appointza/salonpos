namespace Krios.Models.Krios
{
    public class User
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string email { get; set; } = "";
        public string role { get; set; } = "";
        public string outlet { get; set; } = "";
        public string permissions { get; set; } = "";
        public string lastLogin { get; set; } = "";
        public string status { get; set; } = "";
        public string passwordhash { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class UserSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string email { get; set; } = "";
        public string role { get; set; } = "";
        public string status { get; set; } = "";
        public string search { get; set; } = "";
    }

    public class UserDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}
