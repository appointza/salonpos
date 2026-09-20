using Krios.Models.Krios;
using Krios.Utils;

namespace Krios.Services.Krios
{
    public class UserLoginService
    {
        private readonly IDbProvider dbprovider;
        private readonly CustomCryptography cryptography;

        public UserLoginService(IDbProvider dbprovider, CustomCryptography cryptography)
        {
            this.dbprovider = dbprovider;
            this.cryptography = cryptography;
        }

        public async Task<UserLoginRes> Login(UserLoginReq req)
        {
            if (string.IsNullOrWhiteSpace(req.email) || string.IsNullOrWhiteSpace(req.password))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Email and password are required.");

            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();

                var user = await GetUserByEmail(db, req.email.Trim());
                if (user == null)
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid email or password.");

                string passwordHash = cryptography.CalculateSHA256Hash(req.password);
                if (!string.Equals(user.passwordHash, passwordHash, StringComparison.OrdinalIgnoreCase))
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid email or password.");

                if (!string.Equals(user.status, "active", StringComparison.OrdinalIgnoreCase))
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "User is not active.");

                var org = await GetOrganization(db, user.organizationId);

                // When role is staff, resolve staff.id from staff table (by email + org) for use as classteacherid / staff_id in APIs
                string staffId = "";
                if (string.Equals(user.role, "staff", StringComparison.OrdinalIgnoreCase))
                {
                    var resolvedStaffId = await GetStaffIdByEmailAndOrg(db, user.email, user.organizationId);
                    if (!string.IsNullOrWhiteSpace(resolvedStaffId))
                        staffId = resolvedStaffId;
                }

                return new UserLoginRes
                {
                    userId = user.id,
                    email = user.email,
                    role = user.role,
                    organizationId = user.organizationId,
                    organizationName = org?.Name ?? "",
                    organizationSlug = org?.Slug ?? "",
                    staffId = staffId
                };
            }
        }

        public async Task<UserLoginRes> UpdateProfile(UserProfileUpdateReq req)
        {
            if (string.IsNullOrWhiteSpace(req.userId))
                throw new AppException(AppException.ErrorCodes.BadRequest, "User id is required.");
            if (string.IsNullOrWhiteSpace(req.currentPassword))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Current password is required.");

            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();

                var user = await GetUserById(db, req.userId.Trim());
                if (user == null)
                    throw new AppException(AppException.ErrorCodes.UserNotFound, "User not found.");

                string currentHash = cryptography.CalculateSHA256Hash(req.currentPassword);
                if (!string.Equals(user.passwordHash, currentHash, StringComparison.OrdinalIgnoreCase))
                    throw new AppException(AppException.ErrorCodes.InvalidCredential, "Current password is incorrect.");

                string targetEmail = user.email;
                if (!string.IsNullOrWhiteSpace(req.newEmail))
                {
                    targetEmail = req.newEmail.Trim();
                    if (targetEmail.Length < 3 || targetEmail.IndexOf('@') < 1)
                        throw new AppException(AppException.ErrorCodes.BadRequest, "Enter a valid email address.");
                    if (!targetEmail.Equals(user.email, StringComparison.OrdinalIgnoreCase)
                        && await EmailTakenByAnotherUser(db, targetEmail, user.id))
                    {
                        throw new AppException(AppException.ErrorCodes.BadRequest, "That email is already in use.");
                    }
                }

                string targetPasswordHash = user.passwordHash;
                if (!string.IsNullOrWhiteSpace(req.newPassword))
                {
                    if (req.newPassword.Length < 6)
                        throw new AppException(AppException.ErrorCodes.BadRequest, "New password must be at least 6 characters.");
                    targetPasswordHash = cryptography.CalculateSHA256Hash(req.newPassword);
                }

                string targetUsername = UsernameFromEmail(targetEmail);

                await UpdateUserProfileRow(db, user.id, targetEmail, targetUsername, targetPasswordHash);

                if (string.Equals(user.role, "staff", StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrWhiteSpace(user.profileId))
                {
                    await SyncStaffEmail(db, user.profileId, user.organizationId, targetEmail);
                }

                var org = await GetOrganization(db, user.organizationId);
                string staffId = "";
                if (string.Equals(user.role, "staff", StringComparison.OrdinalIgnoreCase))
                {
                    var resolved = await GetStaffIdByEmailAndOrg(db, targetEmail, user.organizationId);
                    if (!string.IsNullOrWhiteSpace(resolved))
                        staffId = resolved;
                }

                return new UserLoginRes
                {
                    userId = user.id,
                    email = targetEmail,
                    role = user.role,
                    organizationId = user.organizationId,
                    organizationName = org?.Name ?? "",
                    organizationSlug = org?.Slug ?? "",
                    staffId = staffId
                };
            }
        }

        private sealed class UserRow
        {
            public string id { get; set; } = "";
            public string email { get; set; } = "";
            public string role { get; set; } = "";
            public string status { get; set; } = "";
            public string organizationId { get; set; } = "";
            public string passwordHash { get; set; } = "";
            public string profileId { get; set; } = "";
            public string username { get; set; } = "";
        }

        private static async Task<UserRow?> GetUserByEmail(IDb db, string email)
        {
            string query = @"
                SELECT id, email, role, status, organization_id, password_hash, profile_id, username
                FROM users
                WHERE lower(email) = lower(@email)
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                {
                    return MapUserRow(reader);
                }
            }

            return null;
        }

        private static async Task<UserRow?> GetUserById(IDb db, string userId)
        {
            string query = @"
                SELECT id, email, role, status, organization_id, password_hash, profile_id, username
                FROM users
                WHERE id = @id
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = userId;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                    return MapUserRow(reader);
            }

            return null;
        }

        private static UserRow MapUserRow(System.Data.Common.DbDataReader reader)
        {
            return new UserRow
            {
                id = reader["id"]?.ToString() ?? "",
                email = reader["email"]?.ToString() ?? "",
                role = reader["role"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                organizationId = reader["organization_id"]?.ToString() ?? "",
                passwordHash = reader["password_hash"]?.ToString() ?? "",
                profileId = reader["profile_id"]?.ToString() ?? "",
                username = reader["username"]?.ToString() ?? ""
            };
        }

        private static string UsernameFromEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return "";
            int at = email.IndexOf('@');
            string local = at > 0 ? email.Substring(0, at) : email;
            local = local.Trim().Replace(" ", "_", StringComparison.Ordinal);
            return local.Length > 0 ? local : email;
        }

        private static async Task<bool> EmailTakenByAnotherUser(IDb db, string email, string excludeUserId)
        {
            string query = @"
                SELECT id FROM users
                WHERE lower(email) = lower(@email)
                  AND id <> @exclude_id
                  AND is_active = true
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "exclude_id", DbTypes.Types.String).Value = excludeUserId;

            using (var reader = await db.Execute(cmd))
            {
                return await reader.ReadAsync();
            }
        }

        private static async Task UpdateUserProfileRow(IDb db, string userId, string email, string username, string passwordHash)
        {
            string query = @"
                UPDATE users
                SET email = @email,
                    username = @username,
                    password_hash = @password_hash,
                    updated_at = @updated_at
                WHERE id = @id
                  AND is_active = true;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = userId;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "username", DbTypes.Types.String).Value = username ?? "";
            db.AddParameter(cmd, "password_hash", DbTypes.Types.String).Value = passwordHash ?? "";
            db.AddParameter(cmd, "updated_at", DbTypes.Types.DateTime).Value = DateTime.UtcNow;

            await db.ExecuteNonQuery(cmd);
        }

        private static async Task SyncStaffEmail(IDb db, string staffId, string organizationId, string email)
        {
            if (string.IsNullOrWhiteSpace(staffId) || string.IsNullOrWhiteSpace(organizationId))
                return;

            string query = @"
                UPDATE staff
                SET email = @email,
                    updated_at = @updated_at
                WHERE staff_id = @staff_id
                  AND organization_id = @organization_id
                  AND is_active = true;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email.Trim();
            db.AddParameter(cmd, "staff_id", DbTypes.Types.String).Value = staffId;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = organizationId;
            db.AddParameter(cmd, "updated_at", DbTypes.Types.DateTime).Value = DateTime.UtcNow;

            await db.ExecuteNonQuery(cmd);
        }

        private static async Task<(string Name, string Slug)?> GetOrganization(IDb db, string organizationId)
        {
            if (string.IsNullOrWhiteSpace(organizationId))
                return null;

            string query = @"
                SELECT name, slug
                FROM organizations
                WHERE id = @id
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.String).Value = organizationId;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                {
                    return (
                        reader["name"]?.ToString() ?? "",
                        reader["slug"]?.ToString() ?? ""
                    );
                }
            }

            return null;
        }

        /// <summary>Look up staff.id by email and organization_id for staff login.</summary>
        private static async Task<string?> GetStaffIdByEmailAndOrg(IDb db, string email, string organizationId)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(organizationId))
                return null;

            string query = @"
                SELECT staff_id
                FROM staff
                WHERE lower(email) = lower(@email)
                  AND organization_id = @organization_id
                  AND is_active = true
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "organization_id", DbTypes.Types.String).Value = organizationId;

            using (var reader = await db.Execute(cmd))
            {
                if (await reader.ReadAsync())
                {
                    var id = reader["staff_id"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(id))
                        return id;
                }
            }

            return null;
        }
    }
}
