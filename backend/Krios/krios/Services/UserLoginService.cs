using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

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

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            var user = await GetUserByEmail(db, req.email.Trim());
            if (user == null)
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid email or password.");

            string passwordHash = cryptography.CalculateSHA256Hash(req.password);
            if (!string.Equals(user.passwordhash, passwordHash, StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid email or password.");

            if (string.Equals(user.status, "Inactive", StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "User is not active.");

            var org = await GetOrganization(db, user.orgId);
            await TouchLastLogin(db, user.id);

            return new UserLoginRes
            {
                userId = user.id,
                email = user.email,
                name = user.name,
                role = user.role,
                organizationId = user.orgId,
                locationId = user.locationId,
                organizationName = org?.name ?? "",
                organizationSlug = org?.slug ?? "",
            };
        }

        public async Task<UserLoginRes> UpdateProfile(UserProfileUpdateReq req)
        {
            if (req.userId <= 0)
                throw new AppException(AppException.ErrorCodes.BadRequest, "User id is required.");
            if (string.IsNullOrWhiteSpace(req.currentPassword))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Current password is required.");

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            var user = await GetUserById(db, req.userId);
            if (user == null)
                throw new AppException(AppException.ErrorCodes.UserNotFound, "User not found.");

            string currentHash = cryptography.CalculateSHA256Hash(req.currentPassword);
            if (!string.Equals(user.passwordhash, currentHash, StringComparison.OrdinalIgnoreCase))
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

            string targetPasswordHash = user.passwordhash;
            if (!string.IsNullOrWhiteSpace(req.newPassword))
            {
                if (req.newPassword.Length < 6)
                    throw new AppException(AppException.ErrorCodes.BadRequest, "New password must be at least 6 characters.");
                targetPasswordHash = cryptography.CalculateSHA256Hash(req.newPassword);
            }

            string targetName = string.IsNullOrWhiteSpace(req.newName) ? user.name : req.newName.Trim();
            await UpdateUserProfileRow(db, user.id, targetEmail, targetName, targetPasswordHash);

            var org = await GetOrganization(db, user.orgId);
            return new UserLoginRes
            {
                userId = user.id,
                email = targetEmail,
                name = targetName,
                role = user.role,
                organizationId = user.orgId,
                locationId = user.locationId,
                organizationName = org?.name ?? "",
                organizationSlug = org?.slug ?? "",
            };
        }

        private static async Task<User?> GetUserByEmail(IDb db, string email)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, email, role, outlet,
                       permissions, ""lastLogin"", status, passwordhash,
                       createdby, createdon, updatedby, updatedon
                FROM users
                WHERE lower(email) = lower(@email)
                  AND status <> 'Inactive'
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;

            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync() ? MapUser(reader) : null;
        }

        private static async Task<User?> GetUserById(IDb db, long userId)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, email, role, outlet,
                       permissions, ""lastLogin"", status, passwordhash,
                       createdby, createdon, updatedby, updatedon
                FROM users
                WHERE id = @id
                  AND status <> 'Inactive'
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = userId;

            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync() ? MapUser(reader) : null;
        }

        private static async Task<bool> EmailTakenByAnotherUser(IDb db, string email, long excludeUserId)
        {
            const string query = @"
                SELECT id FROM users
                WHERE lower(email) = lower(@email)
                  AND id <> @exclude_id
                  AND status <> 'Inactive'
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "exclude_id", DbTypes.Types.Long).Value = excludeUserId;

            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync();
        }

        private static async Task UpdateUserProfileRow(IDb db, long userId, string email, string name, string passwordHash)
        {
            const string query = @"
                UPDATE users
                SET email = @email,
                    name = @name,
                    passwordhash = @passwordhash,
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
                  AND status <> 'Inactive';
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = userId;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = name ?? "";
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = passwordHash ?? "";
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = userId.ToString();
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            await db.ExecuteNonQuery(cmd);
        }

        private static async Task TouchLastLogin(IDb db, long userId)
        {
            const string query = @"
                UPDATE users
                SET ""lastLogin"" = @lastLogin,
                    updatedon = @updatedon
                WHERE id = @id;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = userId;
            db.AddParameter(cmd, "lastLogin", DbTypes.Types.String).Value = DateTime.UtcNow.ToString("o");
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            await db.ExecuteNonQuery(cmd);
        }

        private static async Task<Organization?> GetOrganization(IDb db, long organizationId)
        {
            if (organizationId <= 0) return null;

            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, slug, domain, website,
                       ""businessType"", ""brandColor"", ""pointsPerRupee"", ""rupeesPerPoint"",
                       ""whatsappPhoneNumberId"", ""whatsappBusinessAccountId"", ""whatsappDisplayNumber"",
                       ""whatsappApiKey"", ""whatsappWebhookToken"", ""whatsappApiVersion"", ""whatsappConnected"",
                       status, createdby, createdon, updatedby, updatedon,
                       ""earnUnitRupees"", ""pointsPerUnit"", ""loyaltyMinSpend"",
                       ""rewardWheelWeights"", ""rewardScratchWeights"", ""rewardCustomerTierWeights"",
                       ""publicBookingShowPrizeWheel"", ""publicBookingShowScratchCard""
                FROM organizations
                WHERE id = @id
                  AND status <> 'Inactive'
                LIMIT 1;
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = organizationId;

            using var reader = await db.Execute(cmd);
            if (!await reader.ReadAsync()) return null;

            return new Organization
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                slug = reader["slug"]?.ToString() ?? "",
            };
        }

        private static User MapUser(DbDataReader reader)
        {
            return new User
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                email = reader["email"]?.ToString() ?? "",
                role = reader["role"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                permissions = reader["permissions"]?.ToString() ?? "",
                lastLogin = reader["lastLogin"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                passwordhash = reader["passwordhash"]?.ToString() ?? "",
            };
        }

        private static long ReadLong(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? 0 : Convert.ToInt64(value);
        }
    }
}
