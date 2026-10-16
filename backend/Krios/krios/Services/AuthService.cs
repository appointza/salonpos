using Krios.Models.Krios;
using Krios.Utils;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using System.Data.Common;
using System.Security.Cryptography;

namespace Krios.Services.Krios
{
    public class AuthService
    {
        private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);

        private readonly IDbProvider dbprovider;
        private readonly CustomCryptography cryptography;
        private readonly IMemoryCache memoryCache;
        private readonly OtpMailer otpMailer;
        private readonly IHostEnvironment hostEnvironment;

        public AuthService(
            IDbProvider dbprovider,
            CustomCryptography cryptography,
            IMemoryCache memoryCache,
            OtpMailer otpMailer,
            IHostEnvironment hostEnvironment)
        {
            this.dbprovider = dbprovider;
            this.cryptography = cryptography;
            this.memoryCache = memoryCache;
            this.otpMailer = otpMailer;
            this.hostEnvironment = hostEnvironment;
        }

        public async Task<AuthIdentifyRes> Identify(AuthIdentifyReq req)
        {
            var raw = (req.identifier ?? "").Trim();
            if (string.IsNullOrWhiteSpace(raw))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter your mobile number or business email.");

            if (raw.Contains('@'))
            {
                using IDb db = await dbprovider.GetDb();
                await db.Connect();
                var user = await GetUserByEmail(db, raw);
                if (user == null || string.Equals(user.role, "CUSTOMER", StringComparison.OrdinalIgnoreCase))
                    throw new AppException(AppException.ErrorCodes.UserNotFound, "No workspace account found for this email.");

                return new AuthIdentifyRes
                {
                    accountType = "organization",
                    hasPassword = HasPassword(user.passwordhash),
                    name = user.name,
                    email = user.email,
                    phone = PhoneUtil.Normalize(user.phone),
                    maskedPhone = PhoneUtil.Mask(user.phone),
                    orgId = user.orgId,
                    organizationId = user.orgId,
                };
            }

            var phone = PhoneUtil.Normalize(raw);
            if (phone.Length < 10)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter a valid 10-digit mobile number.");

            using (IDb db = await dbprovider.GetDb())
            {
                await db.Connect();

                var orgUser = await FindOrganizationUserByPhone(db, phone);
                if (orgUser != null)
                {
                    return new AuthIdentifyRes
                    {
                        accountType = "organization",
                        hasPassword = HasPassword(orgUser.passwordhash),
                        name = orgUser.name,
                        email = orgUser.email,
                        phone = phone,
                        maskedPhone = PhoneUtil.Mask(phone),
                        orgId = orgUser.orgId,
                        organizationId = orgUser.orgId,
                    };
                }

                var customerUser = await GetCustomerUserByPhone(db, phone);
                if (customerUser != null)
                {
                    return new AuthIdentifyRes
                    {
                        accountType = "customer",
                        hasPassword = HasPassword(customerUser.passwordhash),
                        name = customerUser.name,
                        email = customerUser.email,
                        phone = phone,
                        maskedPhone = PhoneUtil.Mask(phone),
                    };
                }

                var customerName = await GetCustomerNameByPhone(db, phone);
                if (!string.IsNullOrWhiteSpace(customerName))
                {
                    return new AuthIdentifyRes
                    {
                        accountType = "customer",
                        hasPassword = false,
                        name = customerName,
                        phone = phone,
                        maskedPhone = PhoneUtil.Mask(phone),
                    };
                }
            }

            return new AuthIdentifyRes
            {
                accountType = "unknown",
                hasPassword = false,
                phone = phone,
                maskedPhone = PhoneUtil.Mask(phone),
            };
        }

        public async Task<AuthSendOtpRes> SendOtp(AuthSendOtpReq req)
        {
            var raw = (req.identifier ?? req.email ?? req.phone ?? "").Trim();
            if (string.IsNullOrWhiteSpace(raw))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter your mobile number or business email.");

            string phone = PhoneUtil.Normalize(raw.Contains('@') ? req.phone : raw);
            string email = raw.Contains('@') ? raw.Trim() : (req.email ?? "").Trim();

            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UserLanguageSchema.EnsureColumn(db);

            User? user = null;
            if (email.Contains('@'))
                user = await GetUserByEmail(db, email);
            if (user == null && phone.Length >= 10)
                user = await FindOrganizationUserByPhone(db, phone) ?? await GetCustomerUserByPhone(db, phone);

            if (user != null)
            {
                if (!string.IsNullOrWhiteSpace(user.email)) email = user.email.Trim();
                if (!string.IsNullOrWhiteSpace(user.phone)) phone = PhoneUtil.Normalize(user.phone);
            }

            if (phone.Length < 10 && !OtpMailer.IsDeliverableEmail(email))
                throw new AppException(AppException.ErrorCodes.BadRequest, "This account has no mobile or email to receive a code.");

            var otp = GenerateOtp();
            if (phone.Length >= 10)
                memoryCache.Set(OtpCacheKey(phone), otp, OtpLifetime);
            if (!string.IsNullOrWhiteSpace(email))
                memoryCache.Set(OtpCacheKey(email.ToLowerInvariant()), otp, OtpLifetime);

            var deliverable = OtpMailer.IsDeliverableEmail(email);
            var emailed = false;
            if (deliverable)
            {
                try
                {
                    await otpMailer.SendOtp(email, otp);
                    emailed = true;
                }
                catch (Exception)
                {
                    if (!hostEnvironment.IsDevelopment())
                        throw new AppException(AppException.ErrorCodes.BadRequest, "Could not send the verification email. Try again or ask your admin.");
                }
            }

            if (!emailed && !hostEnvironment.IsDevelopment())
            {
                if (!deliverable)
                    throw new AppException(AppException.ErrorCodes.BadRequest, "No email on this account. Ask your admin to add one, then reset.");
                throw new AppException(AppException.ErrorCodes.BadRequest, "Could not send the verification email.");
            }

            var hint = emailed
                ? $"Code sent to {OtpMailer.MaskEmail(email)}"
                : $"Dev OTP: {otp} (set Mail:Host in appsettings to email it)";

            return new AuthSendOtpRes
            {
                sent = emailed || hostEnvironment.IsDevelopment(),
                maskedPhone = PhoneUtil.Mask(phone),
                maskedEmail = deliverable ? OtpMailer.MaskEmail(email) : "",
                hint = hint,
                channel = emailed ? "email" : "dev",
            };
        }

        public async Task<AuthUpdateLanguageRes> UpdateLanguage(AuthUpdateLanguageReq req)
        {
            if (req.userId <= 0)
                throw new AppException(AppException.ErrorCodes.BadRequest, "User is required.");
            var language = UserLanguageSchema.Normalize(req.language);

            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UserLanguageSchema.EnsureColumn(db);

            const string query = @"
                UPDATE users SET language = @language, updatedon = @updatedon
                WHERE id = @id AND status <> 'Inactive';
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.userId;
            db.AddParameter(cmd, "language", DbTypes.Types.String).Value = language;
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            if (await db.ExecuteNonQuery(cmd) <= 0)
                throw new AppException(AppException.ErrorCodes.UserNotFound, "User not found.");

            return new AuthUpdateLanguageRes { language = language };
        }

        public async Task<UserLoginRes> SetupCustomerPassword(AuthSetupCustomerPasswordReq req)
        {
            var phone = PhoneUtil.Normalize(req.phone);
            if (phone.Length < 10)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter a valid mobile number.");
            if (string.IsNullOrWhiteSpace(req.otp))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter the verification code.");
            if (string.IsNullOrWhiteSpace(req.password) || req.password.Length < 6)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Password must be at least 6 characters.");

            if (!VerifyOtp(phone, req.otp.Trim()))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Verification code did not match.");

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            var name = req.name?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(name))
                name = await GetCustomerNameByPhone(db, phone);
            if (string.IsNullOrWhiteSpace(name))
                name = "Customer";

            var hash = cryptography.CalculateSHA256Hash(req.password);
            var existing = await GetCustomerUserByPhone(db, phone);
            if (existing != null)
            {
                await UpdateCustomerUserPassword(db, existing.id, name, hash);
                memoryCache.Remove(OtpCacheKey(phone));
                return BuildCustomerLoginRes(existing.id, existing.email, name, phone, existing.language);
            }

            var userId = await InsertCustomerUser(db, phone, name, hash);
            memoryCache.Remove(OtpCacheKey(phone));
            return BuildCustomerLoginRes(userId, CustomerEmail(phone), name, phone);
        }

        public async Task<UserLoginRes> LoginCustomer(AuthCustomerLoginReq req)
        {
            var phone = PhoneUtil.Normalize(req.phone);
            if (phone.Length < 10 || string.IsNullOrWhiteSpace(req.password))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Mobile number and password are required.");

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            var user = await GetCustomerUserByPhone(db, phone);
            if (user == null)
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "No customer account for this mobile. Verify with OTP first.");

            var hash = cryptography.CalculateSHA256Hash(req.password);
            if (!string.Equals(user.passwordhash, hash, StringComparison.OrdinalIgnoreCase))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Invalid mobile number or password.");

            await TouchLastLogin(db, user.id);
            return BuildCustomerLoginRes(user.id, user.email, user.name, phone, user.language);
        }

        public async Task<UserLoginRes> ResetOrganizationPassword(AuthResetOrganizationPasswordReq req)
        {
            var phone = PhoneUtil.Normalize(req.phone);
            var email = (req.email ?? "").Trim();
            if (phone.Length < 10 && !email.Contains('@'))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter your mobile number or business email.");
            if (string.IsNullOrWhiteSpace(req.otp))
                throw new AppException(AppException.ErrorCodes.BadRequest, "Enter the verification code.");
            if (string.IsNullOrWhiteSpace(req.password) || req.password.Length < 6)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Password must be at least 6 characters.");

            if (!VerifyOtp(phone, req.otp.Trim(), email))
                throw new AppException(AppException.ErrorCodes.InvalidCredential, "Verification code did not match.");

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            User? user = null;
            if (!string.IsNullOrWhiteSpace(req.email))
            {
                user = await GetUserByEmail(db, req.email.Trim());
                if (user != null && string.Equals(user.role, "CUSTOMER", StringComparison.OrdinalIgnoreCase))
                    user = null;
            }
            if (user == null && phone.Length >= 10)
                user = await FindOrganizationUserByPhone(db, phone);
            if (user == null)
                throw new AppException(AppException.ErrorCodes.UserNotFound, "No workspace account found for this login.");

            var hash = cryptography.CalculateSHA256Hash(req.password);
            await UpdateWorkspaceUserPassword(db, user.id, hash);
            memoryCache.Remove(OtpCacheKey(phone));
            await TouchLastLogin(db, user.id);

            var org = await GetOrganization(db, user.orgId);
            var orgId = org != null && org.orgId > 0 ? org.orgId : (org?.id > 0 ? org.id : user.orgId);
            return new UserLoginRes
            {
                userId = user.id,
                email = user.email,
                name = user.name,
                role = user.role,
                organizationId = orgId,
                orgId = orgId,
                locationId = user.locationId,
                organizationName = org?.name ?? "",
                organizationSlug = org?.slug ?? "",
                mustChangePassword = false,
                language = UserLanguageSchema.Normalize(user.language),
            };
        }

        private static string OtpCacheKey(string value) => $"auth-otp:{value}";

        private static string GenerateOtp()
        {
            var value = RandomNumberGenerator.GetInt32(100000, 999999);
            return value.ToString();
        }

        private bool VerifyOtp(string phone, string otp, string? email = null)
        {
            if (phone.Length >= 10
                && memoryCache.TryGetValue(OtpCacheKey(phone), out string? byPhone)
                && string.Equals(byPhone, otp, StringComparison.Ordinal))
                return true;
            var mail = (email ?? "").Trim().ToLowerInvariant();
            return mail.Length > 0
                && memoryCache.TryGetValue(OtpCacheKey(mail), out string? byEmail)
                && string.Equals(byEmail, otp, StringComparison.Ordinal);
        }

        private static bool HasPassword(string? hash) => !string.IsNullOrWhiteSpace(hash);

        private static string CustomerEmail(string phone) => $"{phone}@salon.customer";

        private static UserLoginRes BuildCustomerLoginRes(long userId, string email, string name, string phone, string? language = null)
        {
            return new UserLoginRes
            {
                userId = userId,
                email = email,
                name = name,
                role = "CUSTOMER",
                organizationId = 0,
                orgId = 0,
                locationId = 0,
                organizationName = "",
                organizationSlug = "",
                language = UserLanguageSchema.Normalize(language),
            };
        }

        private static async Task<User?> FindOrganizationUserByPhone(IDb db, string phone)
        {
            await UserLanguageSchema.EnsureColumn(db);
            const string byUserPhone = @"
                SELECT id, ""orgId"", ""locationId"", name, email, role, outlet,
                       permissions, ""lastLogin"", status, passwordhash, phone, language,
                       createdby, createdon, updatedby, updatedon
                FROM users
                WHERE status <> 'Inactive'
                  AND role <> 'CUSTOMER'
                  AND RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = @phone
                ORDER BY id
                LIMIT 1;
            ";
            var direct = await QueryUser(db, byUserPhone, phone);
            if (direct != null) return direct;

            const string byStaffPhone = @"
                SELECT u.id, u.""orgId"", u.""locationId"", u.name, u.email, u.role, u.outlet,
                       u.permissions, u.""lastLogin"", u.status, u.passwordhash, u.phone, u.language,
                       u.createdby, u.createdon, u.updatedby, u.updatedon
                FROM staff s
                INNER JOIN users u ON lower(u.email) = lower(s.email)
                WHERE s.status <> 'Inactive'
                  AND u.status <> 'Inactive'
                  AND u.role <> 'CUSTOMER'
                  AND COALESCE(s.email, '') <> ''
                  AND RIGHT(regexp_replace(COALESCE(s.phone, ''), '\D', '', 'g'), 10) = @phone
                ORDER BY u.id
                LIMIT 1;
            ";
            return await QueryUser(db, byStaffPhone, phone);
        }

        private static async Task<User?> GetCustomerUserByPhone(IDb db, string phone)
        {
            await UserLanguageSchema.EnsureColumn(db);
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, email, role, outlet,
                       permissions, ""lastLogin"", status, passwordhash, phone, language,
                       createdby, createdon, updatedby, updatedon
                FROM users
                WHERE status <> 'Inactive'
                  AND role = 'CUSTOMER'
                  AND (
                    RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = @phone
                    OR lower(email) = lower(@email)
                  )
                ORDER BY id
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = phone;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = CustomerEmail(phone);
            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync() ? MapUser(reader) : null;
        }

        private static async Task<User?> GetUserByEmail(IDb db, string email)
        {
            await UserLanguageSchema.EnsureColumn(db);
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, email, role, outlet,
                       permissions, ""lastLogin"", status, passwordhash, phone, language,
                       createdby, createdon, updatedby, updatedon
                FROM users
                WHERE lower(email) = lower(@email)
                  AND status <> 'Inactive'
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email.Trim();
            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync() ? MapUser(reader) : null;
        }

        private static async Task<User?> QueryUser(IDb db, string query, string phone)
        {
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = phone;
            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync() ? MapUser(reader) : null;
        }

        private static async Task<string> GetCustomerNameByPhone(IDb db, string phone)
        {
            const string query = @"
                SELECT name
                FROM customers
                WHERE RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = @phone
                ORDER BY COALESCE(""lastVisit"", createdon) DESC NULLS LAST, id DESC
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = phone;
            using var reader = await db.Execute(cmd);
            if (!await reader.ReadAsync()) return "";
            return reader["name"]?.ToString()?.Trim() ?? "";
        }

        private static async Task<long> InsertCustomerUser(IDb db, string phone, string name, string passwordHash)
        {
            const string query = @"
                INSERT INTO users (
                    ""orgId"", ""locationId"", name, email, role, outlet, permissions,
                    ""lastLogin"", status, passwordhash, phone,
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    0, 0, @name, @email, 'CUSTOMER', '', '',
                    '', 'Active', @passwordhash, @phone,
                    'system', @today, 'system', @today
                )
                RETURNING id;
            ";
            var today = DateTime.UtcNow.Date;
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = name;
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = CustomerEmail(phone);
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = passwordHash;
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = phone;
            db.AddParameter(cmd, "today", DbTypes.Types.Date).Value = today;
            using var reader = await db.Execute(cmd);
            if (!await reader.ReadAsync())
                throw new AppException(AppException.ErrorCodes.BadRequest, "Could not create customer account.");
            return Convert.ToInt64(reader["id"]);
        }

        private static async Task UpdateWorkspaceUserPassword(IDb db, long userId, string passwordHash)
        {
            const string query = @"
                UPDATE users
                SET passwordhash = @passwordhash,
                    updatedby = @updatedby,
                    updatedon = @today
                WHERE id = @id
                  AND role <> 'CUSTOMER';
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = userId;
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = passwordHash;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = userId.ToString();
            db.AddParameter(cmd, "today", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            await db.ExecuteNonQuery(cmd);
        }

        private static async Task<Organization?> GetOrganization(IDb db, long organizationId)
        {
            if (organizationId <= 0) return null;
            const string query = @"
                SELECT id, ""orgId"", name, slug
                FROM organizations
                WHERE status <> 'Inactive'
                  AND (id = @id OR ""orgId"" = @id)
                ORDER BY id
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = organizationId;
            using var reader = await db.Execute(cmd);
            if (!await reader.ReadAsync()) return null;
            return new Organization
            {
                id = reader["id"] == DBNull.Value ? 0 : Convert.ToInt64(reader["id"]),
                orgId = reader["orgId"] == DBNull.Value ? 0 : Convert.ToInt64(reader["orgId"]),
                name = reader["name"]?.ToString() ?? "",
                slug = reader["slug"]?.ToString() ?? "",
            };
        }

        private static async Task UpdateCustomerUserPassword(IDb db, long userId, string name, string passwordHash)
        {
            const string query = @"
                UPDATE users
                SET name = @name,
                    passwordhash = @passwordhash,
                    updatedby = 'system',
                    updatedon = @today
                WHERE id = @id
                  AND role = 'CUSTOMER';
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = userId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = name;
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = passwordHash;
            db.AddParameter(cmd, "today", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            await db.ExecuteNonQuery(cmd);
        }

        private static async Task TouchLastLogin(IDb db, long userId)
        {
            const string query = @"
                UPDATE users SET ""lastLogin"" = @lastLogin, updatedon = @updatedon WHERE id = @id;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = userId;
            db.AddParameter(cmd, "lastLogin", DbTypes.Types.String).Value = DateTime.UtcNow.ToString("o");
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            await db.ExecuteNonQuery(cmd);
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
                phone = HasColumn(reader, "phone") ? reader["phone"]?.ToString() ?? "" : "",
                language = HasColumn(reader, "language")
                    ? UserLanguageSchema.Normalize(reader["language"]?.ToString())
                    : "en",
            };
        }

        private static bool HasColumn(DbDataReader reader, string column)
        {
            for (var i = 0; i < reader.FieldCount; i++)
                if (string.Equals(reader.GetName(i), column, StringComparison.OrdinalIgnoreCase))
                    return true;
            return false;
        }

        private static long ReadLong(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? 0 : Convert.ToInt64(value);
        }
    }
}
