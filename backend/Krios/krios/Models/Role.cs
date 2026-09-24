namespace Krios.Models.Krios
{
    public class Role
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string name { get; set; } = "";
        public string code { get; set; } = "";
        public string description { get; set; } = "";
        public string builtIn { get; set; } = "";
        public string view { get; set; } = "";
        public string edit { get; set; } = "";
        public string status { get; set; } = "";
        public string createdby { get; set; } = "";
        public DateTime? createdon { get; set; }
        public string updatedby { get; set; } = "";
        public DateTime? updatedon { get; set; }
    }

    public class RoleSelectReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
        public long locationId { get; set; }
        public string search { get; set; } = "";
        public string status { get; set; } = "";
    }

    public class RoleDeleteReq
    {
        public long id { get; set; }
        public long orgId { get; set; }
    }
}