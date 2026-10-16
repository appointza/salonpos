using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class UserService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;
        private readonly CustomCryptography cryptography;

        public UserService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            CustomCryptography cryptography)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.cryptography = cryptography;
        }

        public async Task<List<User>> Select(UserSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UserLanguageSchema.EnsureColumn(db);
            return await SelectTransaction(db, req);
        }

        public async Task<List<User>> SelectTransaction(IDb db, UserSelectReq req)
        {
            const string query = @"
                SELECT
                    id, ""orgId"", ""locationId"", name, email, phone, role, outlet,
                    permissions, ""lastLogin"", status, passwordhash, language,
                    createdby, createdon, updatedby, updatedon
                FROM users
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);
            if (!string.IsNullOrWhiteSpace(req.email))
                qb.AddParameter("email", "=", "email", req.email, DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.role))
                qb.AddParameter("role", "=", "role", req.role, DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.status))
                qb.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            else
                qb.AddParameter("status", "<>", "status", "Inactive", DbTypes.Types.String);

            if (!string.IsNullOrWhiteSpace(req.search))
                qb.AddParameter("name", "ILIKE", "name", $"%{req.search}%", DbTypes.Types.String);

            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<User>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(MapUser(reader));

            return result;
        }

        public async Task<User> Insert(User user)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UserLanguageSchema.EnsureColumn(db);
            ApplyIncomingPassword(user, isInsert: true);
            await InsertTransaction(db, user);
            user.password = "";
            user.passwordhash = "";
            return user;
        }

        public async Task InsertTransaction(IDb db, User user)
        {
            const string query = @"
                INSERT INTO users (
                    ""orgId"", ""locationId"", name, email, phone, role, outlet,
                    permissions, ""lastLogin"", status, passwordhash, language,
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @name, @email, @phone, @role, @outlet,
                    @permissions, @lastLogin, @status, @passwordhash, @language,
                    @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            user.status = string.IsNullOrWhiteSpace(user.status) ? "Active" : user.status;
            user.phone = PhoneUtil.Normalize(user.phone);
            if (string.IsNullOrWhiteSpace(user.email) && user.phone.Length >= 10)
                user.email = $"{user.phone}@salon.staff";
            user.lastLogin = "";
            user.createdon = today;
            user.updatedon = today;
            user.createdby = actor;
            user.updatedby = actor;

            var cmd = db.GetCommand(query);
            BindUserParameters(cmd, db, user, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                user.id = Convert.ToInt64(reader["id"]);
        }

        public async Task<User> Update(User user)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UserLanguageSchema.EnsureColumn(db);
            ApplyIncomingPassword(user, isInsert: false);
            await UpdateTransaction(db, user);
            user.password = "";
            user.passwordhash = "";
            return user;
        }

        public async Task<bool> UpdateTransaction(IDb db, User user)
        {
            const string query = @"
                UPDATE users SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    email = @email,
                    phone = @phone,
                    role = @role,
                    outlet = @outlet,
                    permissions = @permissions,
                    ""lastLogin"" = CASE WHEN @passwordhash = '' THEN ""lastLogin"" ELSE '' END,
                    status = @status,
                    passwordhash = CASE WHEN @passwordhash = '' THEN passwordhash ELSE @passwordhash END,
                    language = CASE WHEN @language = '' THEN language ELSE @language END,
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";

            user.phone = PhoneUtil.Normalize(user.phone);
            if (string.IsNullOrWhiteSpace(user.email) && user.phone.Length >= 10)
                user.email = $"{user.phone}@salon.staff";
            user.updatedon = DateTime.UtcNow.Date;
            user.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : user.updatedby;

            var cmd = db.GetCommand(query);
            BindUserParameters(cmd, db, user, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(UserDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, UserDeleteReq req)
        {
            const string query = @"
                UPDATE users
                SET status = 'Inactive',
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";

            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.id;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value =
                requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            return await db.ExecuteNonQuery(cmd) > 0;
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
                phone = HasColumn(reader, "phone") ? reader["phone"]?.ToString() ?? "" : "",
                role = reader["role"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                permissions = reader["permissions"]?.ToString() ?? "",
                lastLogin = reader["lastLogin"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                passwordhash = "",
                language = HasColumn(reader, "language")
                    ? UserLanguageSchema.Normalize(reader["language"]?.ToString())
                    : "en",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void BindUserParameters(DbCommand cmd, IDb db, User user, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = user.id;

            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = user.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = user.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = user.name ?? "";
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = user.email ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = PhoneUtil.Normalize(user.phone);
            db.AddParameter(cmd, "role", DbTypes.Types.String).Value = user.role ?? "";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = user.outlet ?? "";
            db.AddParameter(cmd, "permissions", DbTypes.Types.String).Value = user.permissions ?? "";
            db.AddParameter(cmd, "lastLogin", DbTypes.Types.String).Value = user.lastLogin ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = user.status ?? "";
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = user.passwordhash ?? "";
            db.AddParameter(cmd, "language", DbTypes.Types.String).Value = UserLanguageSchema.Normalize(user.language);
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = user.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = user.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = user.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = user.updatedon ?? DateTime.UtcNow.Date;
        }

        private void ApplyIncomingPassword(User user, bool isInsert)
        {
            var plain = (user.password ?? "").Trim();
            if (string.IsNullOrWhiteSpace(plain))
            {
                if (isInsert)
                    throw new AppException(AppException.ErrorCodes.BadRequest, "Set a password of at least 6 characters.");
                user.passwordhash = "";
                return;
            }
            if (plain.Length < 6)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Password must be at least 6 characters.");
            user.passwordhash = cryptography.CalculateSHA256Hash(plain);
            user.lastLogin = "";
            user.password = "";
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

        private static DateTime? ReadDate(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? null : Convert.ToDateTime(value);
        }
    }
}
