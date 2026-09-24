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

        public UserService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<User>> Select(UserSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<User>> SelectTransaction(IDb db, UserSelectReq req)
        {
            const string query = @"
                SELECT
                    id, ""orgId"", ""locationId"", name, email, role, outlet,
                    permissions, ""lastLogin"", status, passwordhash,
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
            await InsertTransaction(db, user);
            return user;
        }

        public async Task InsertTransaction(IDb db, User user)
        {
            const string query = @"
                INSERT INTO users (
                    ""orgId"", ""locationId"", name, email, role, outlet,
                    permissions, ""lastLogin"", status, passwordhash,
                    createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @name, @email, @role, @outlet,
                    @permissions, @lastLogin, @status, @passwordhash,
                    @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            user.status = string.IsNullOrWhiteSpace(user.status) ? "Active" : user.status;
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
            await UpdateTransaction(db, user);
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
                    role = @role,
                    outlet = @outlet,
                    permissions = @permissions,
                    ""lastLogin"" = @lastLogin,
                    status = @status,
                    passwordhash = @passwordhash,
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";

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
                role = reader["role"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                permissions = reader["permissions"]?.ToString() ?? "",
                lastLogin = reader["lastLogin"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                passwordhash = reader["passwordhash"]?.ToString() ?? "",
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
            db.AddParameter(cmd, "role", DbTypes.Types.String).Value = user.role ?? "";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = user.outlet ?? "";
            db.AddParameter(cmd, "permissions", DbTypes.Types.String).Value = user.permissions ?? "";
            db.AddParameter(cmd, "lastLogin", DbTypes.Types.String).Value = user.lastLogin ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = user.status ?? "";
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = user.passwordhash ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = user.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = user.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = user.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = user.updatedon ?? DateTime.UtcNow.Date;
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
