using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class StaffService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;
        private readonly CustomCryptography cryptography;
        private static bool profileColumnsReady;

        public StaffService(
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

        public async Task<List<Staff>> Select(StaffSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Staff>> SelectTransaction(IDb db, StaffSelectReq req)
        {
            await EnsureProfileColumns(db);
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, role, outlet, phone, email, ""joinDate"", ""baseSalary"", ""commissionRate"", target, status, address, ""bankName"", ""bankAccount"", ""bankIfsc"", ""idProofType"", ""idProofRef"", ""addressProofType"", ""addressProofRef"", createdby, createdon, updatedby, updatedon
                FROM staff
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);

            if (!string.IsNullOrWhiteSpace(req.status))
                qb.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            else
                qb.AddParameter("status", "<>", "status", "Inactive", DbTypes.Types.String);
            if (!string.IsNullOrWhiteSpace(req.search))
                qb.AddParameter("name", "ILIKE", "search", "%" + req.search + "%", DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<Staff>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Staff> Insert(Staff entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            await UpsertLoginUser(db, entity);
            entity.password = "";
            return entity;
        }

        public async Task InsertTransaction(IDb db, Staff entity)
        {
            await EnsureProfileColumns(db);
            const string query = @"
                INSERT INTO staff (
                    ""orgId"", ""locationId"", name, role, outlet, phone, email, ""joinDate"", ""baseSalary"", ""commissionRate"", target, status, address, ""bankName"", ""bankAccount"", ""bankIfsc"", ""idProofType"", ""idProofRef"", ""addressProofType"", ""addressProofRef"", createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @name, @role, @outlet, @phone, @email, @joinDate, @baseSalary, @commissionRate, @target, @status, @address, @bankName, @bankAccount, @bankIfsc, @idProofType, @idProofRef, @addressProofType, @addressProofRef, @createdby, @createdon, @updatedby, @updatedon
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            entity.status = string.IsNullOrWhiteSpace(entity.status) ? "Active" : entity.status;
            if (entity.createdon == null) entity.createdon = today;
            if (entity.updatedon == null) entity.updatedon = today;
            if (string.IsNullOrWhiteSpace(entity.createdby)) entity.createdby = actor;
            if (string.IsNullOrWhiteSpace(entity.updatedby)) entity.updatedby = actor;

            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                entity.id = Convert.ToInt64(reader["id"]);
        }

        public async Task<Staff> Update(Staff entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            await UpsertLoginUser(db, entity);
            entity.password = "";
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Staff entity)
        {
            await EnsureProfileColumns(db);
            const string query = @"
                UPDATE staff SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    role = @role,
                    outlet = @outlet,
                    phone = @phone,
                    email = @email,
                    ""joinDate"" = @joinDate,
                    ""baseSalary"" = @baseSalary,
                    ""commissionRate"" = @commissionRate,
                    target = @target,
                    status = @status,
                    address = @address,
                    ""bankName"" = @bankName,
                    ""bankAccount"" = @bankAccount,
                    ""bankIfsc"" = @bankIfsc,
                    ""idProofType"" = @idProofType,
                    ""idProofRef"" = @idProofRef,
                    ""addressProofType"" = @addressProofType,
                    ""addressProofRef"" = @addressProofRef,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(StaffDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, StaffDeleteReq req)
        {
            const string query = @"
                UPDATE staff
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

        private static Staff Map(DbDataReader reader)
        {
            return new Staff
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                role = reader["role"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                phone = reader["phone"]?.ToString() ?? "",
                email = reader["email"]?.ToString() ?? "",
                joinDate = ReadDate(reader, "joinDate"),
                baseSalary = ReadLong(reader, "baseSalary"),
                commissionRate = ReadDecimal(reader, "commissionRate"),
                target = ReadLong(reader, "target"),
                status = reader["status"]?.ToString() ?? "",
                address = reader["address"]?.ToString() ?? "",
                bankName = reader["bankName"]?.ToString() ?? "",
                bankAccount = reader["bankAccount"]?.ToString() ?? "",
                bankIfsc = reader["bankIfsc"]?.ToString() ?? "",
                idProofType = reader["idProofType"]?.ToString() ?? "",
                idProofRef = reader["idProofRef"]?.ToString() ?? "",
                addressProofType = reader["addressProofType"]?.ToString() ?? "",
                addressProofRef = reader["addressProofRef"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Staff entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = entity.name ?? "";
            db.AddParameter(cmd, "role", DbTypes.Types.String).Value = entity.role ?? "";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = entity.outlet ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = entity.phone ?? "";
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = entity.email ?? "";
            db.AddParameter(cmd, "joinDate", DbTypes.Types.Date).Value = entity.joinDate ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "baseSalary", DbTypes.Types.Long).Value = entity.baseSalary;
            db.AddParameter(cmd, "commissionRate", DbTypes.Types.Decimal).Value = entity.commissionRate;
            db.AddParameter(cmd, "target", DbTypes.Types.Long).Value = entity.target;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "address", DbTypes.Types.String).Value = entity.address ?? "";
            db.AddParameter(cmd, "bankName", DbTypes.Types.String).Value = entity.bankName ?? "";
            db.AddParameter(cmd, "bankAccount", DbTypes.Types.String).Value = entity.bankAccount ?? "";
            db.AddParameter(cmd, "bankIfsc", DbTypes.Types.String).Value = entity.bankIfsc ?? "";
            db.AddParameter(cmd, "idProofType", DbTypes.Types.String).Value = entity.idProofType ?? "";
            db.AddParameter(cmd, "idProofRef", DbTypes.Types.String).Value = entity.idProofRef ?? "";
            db.AddParameter(cmd, "addressProofType", DbTypes.Types.String).Value = entity.addressProofType ?? "";
            db.AddParameter(cmd, "addressProofRef", DbTypes.Types.String).Value = entity.addressProofRef ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
        }

        private async Task UpsertLoginUser(IDb db, Staff staff)
        {
            var password = (staff.password ?? "").Trim();
            var phone = PhoneUtil.Normalize(staff.phone);
            var email = (staff.email ?? "").Trim();
            if (string.IsNullOrWhiteSpace(email) && phone.Length >= 10)
                email = $"{phone}@salon.staff";

            if (string.IsNullOrWhiteSpace(password))
            {
                if (staff.id > 0)
                    await SyncLoginUserProfile(db, staff, email, phone, hash: null);
                return;
            }

            if (password.Length < 6)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Password must be at least 6 characters.");
            if (string.IsNullOrWhiteSpace(email) && phone.Length < 10)
                throw new AppException(AppException.ErrorCodes.BadRequest, "Email or mobile is required to set a login password.");

            var hash = cryptography.CalculateSHA256Hash(password);
            await SyncLoginUserProfile(db, staff, email, phone, hash);
        }

        private async Task SyncLoginUserProfile(IDb db, Staff staff, string email, string phone, string? hash)
        {
            if (string.IsNullOrWhiteSpace(email) && phone.Length < 10) return;

            var existing = await FindLoginUser(db, email, phone);
            var role = LoginRole(staff.role);
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            var today = DateTime.UtcNow.Date;

            await UserLanguageSchema.EnsureColumn(db);

            if (existing == null)
            {
                if (string.IsNullOrWhiteSpace(hash)) return;
                const string insert = @"
                    INSERT INTO users (
                        ""orgId"", ""locationId"", name, email, phone, role, outlet, permissions,
                        ""lastLogin"", status, passwordhash,
                        createdby, createdon, updatedby, updatedon
                    )
                    VALUES (
                        @orgId, @locationId, @name, @email, @phone, @role, @outlet, '',
                        '', @status, @passwordhash,
                        @actor, @today, @actor, @today
                    );
                ";
                var cmd = db.GetCommand(insert);
                BindLoginUser(cmd, db, staff, email, phone, role, hash, actor, today);
                await db.ExecuteNonQuery(cmd);
                return;
            }

            const string update = @"
                UPDATE users SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    email = @email,
                    phone = @phone,
                    role = @role,
                    outlet = @outlet,
                    status = @status,
                    passwordhash = CASE WHEN @passwordhash = '' THEN passwordhash ELSE @passwordhash END,
                    ""lastLogin"" = CASE WHEN @passwordhash = '' THEN ""lastLogin"" ELSE '' END,
                    updatedby = @actor,
                    updatedon = @today
                WHERE id = @id
                  AND role <> 'CUSTOMER'
                  AND role <> 'SUPER_ADMIN';
            ";
            var upd = db.GetCommand(update);
            BindLoginUser(upd, db, staff, email, phone, role, hash ?? "", actor, today);
            db.AddParameter(upd, "id", DbTypes.Types.Long).Value = existing.id;
            await db.ExecuteNonQuery(upd);
        }

        private static void BindLoginUser(
            DbCommand cmd,
            IDb db,
            Staff staff,
            string email,
            string phone,
            string role,
            string hash,
            string actor,
            DateTime today)
        {
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = staff.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = staff.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = staff.name ?? "";
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email;
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = phone;
            db.AddParameter(cmd, "role", DbTypes.Types.String).Value = role;
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = staff.outlet ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value =
                string.Equals(staff.status, "Inactive", StringComparison.OrdinalIgnoreCase) ? "Inactive" : "Active";
            db.AddParameter(cmd, "passwordhash", DbTypes.Types.String).Value = hash ?? "";
            db.AddParameter(cmd, "actor", DbTypes.Types.String).Value = actor;
            db.AddParameter(cmd, "today", DbTypes.Types.Date).Value = today;
        }

        private static async Task<User?> FindLoginUser(IDb db, string email, string phone)
        {
            const string query = @"
                SELECT id, email, role
                FROM users
                WHERE status <> 'Inactive'
                  AND role <> 'CUSTOMER'
                  AND (
                    (@email <> '' AND lower(email) = lower(@email))
                    OR (@phone <> '' AND RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = @phone)
                  )
                ORDER BY CASE WHEN @email <> '' AND lower(email) = lower(@email) THEN 0 ELSE 1 END, id
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = email ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = phone ?? "";
            using var reader = await db.Execute(cmd);
            if (!await reader.ReadAsync()) return null;
            return new User
            {
                id = Convert.ToInt64(reader["id"]),
                email = reader["email"]?.ToString() ?? "",
                role = reader["role"]?.ToString() ?? "",
            };
        }

        private static string LoginRole(string? staffRole)
        {
            var role = (staffRole ?? "").Trim();
            if (role.Equals("SUPER_ADMIN", StringComparison.OrdinalIgnoreCase)) return "SUPER_ADMIN";
            if (role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase) ||
                role.Equals("Outlet Manager", StringComparison.OrdinalIgnoreCase) ||
                role.Equals("Owner", StringComparison.OrdinalIgnoreCase))
                return "ADMIN";
            if (role.Equals("STAFF", StringComparison.OrdinalIgnoreCase) ||
                role.Equals("Receptionist", StringComparison.OrdinalIgnoreCase))
                return "STAFF";
            return "STYLIST";
        }

        private static async Task EnsureProfileColumns(IDb db)
        {
            if (profileColumnsReady) return;
            const string query = @"
                ALTER TABLE staff
                  ADD COLUMN IF NOT EXISTS address TEXT,
                  ADD COLUMN IF NOT EXISTS ""bankName"" VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS ""bankAccount"" VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS ""bankIfsc"" VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS ""idProofType"" VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS ""idProofRef"" VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS ""addressProofType"" VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS ""addressProofRef"" VARCHAR(255);
            ";
            var cmd = db.GetCommand(query);
            await db.ExecuteNonQuery(cmd);
            profileColumnsReady = true;
        }

        private static long ReadLong(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? 0 : Convert.ToInt64(value);
        }

        private static decimal ReadDecimal(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? 0 : Convert.ToDecimal(value);
        }

        private static DateTime? ReadDate(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value == DBNull.Value ? null : Convert.ToDateTime(value);
        }

        private static bool ReadBool(DbDataReader reader, string column)
        {
            var value = reader[column];
            return value != DBNull.Value && Convert.ToBoolean(value);
        }
    }
}
