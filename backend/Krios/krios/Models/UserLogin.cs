namespace Krios.Models.Krios
{
    public class UserLoginReq
    {
        public string email { get; set; }
        public string password { get; set; }
    }

    public class UserLoginRes
    {
        public string userId { get; set; }
        public string email { get; set; }
        public string role { get; set; }
        public string organizationId { get; set; }
        public string organizationName { get; set; }
        public string organizationSlug { get; set; }
        /// <summary>Staff table id (staff.id) when logged in as staff; used for classteacherid, staff_schedules, etc.</summary>
        public string staffId { get; set; } = "";
    }

    /// <summary>Self-service profile update for rows in public.users (same table as Login).</summary>
    public class UserProfileUpdateReq
    {
        public string userId { get; set; } = "";
        public string currentPassword { get; set; } = "";
        /// <summary>If empty, email is unchanged.</summary>
        public string newEmail { get; set; } = "";
        /// <summary>If empty, password is unchanged.</summary>
        public string newPassword { get; set; } = "";
    }
}
