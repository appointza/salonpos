namespace Krios.Models.Krios
{
    public class UserLoginReq
    {
        public string email { get; set; } = "";
        public string password { get; set; } = "";
    }

    public class UserLoginRes
    {
        public long userId { get; set; }
        public string email { get; set; } = "";
        public string name { get; set; } = "";
        public string role { get; set; } = "";
        public long organizationId { get; set; }
        public long locationId { get; set; }
        public string organizationName { get; set; } = "";
        public string organizationSlug { get; set; } = "";
    }

    public class UserProfileUpdateReq
    {
        public long userId { get; set; }
        public string currentPassword { get; set; } = "";
        public string newEmail { get; set; } = "";
        public string newPassword { get; set; } = "";
        public string newName { get; set; } = "";
    }
}
