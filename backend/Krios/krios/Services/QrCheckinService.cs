using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class QrCheckinService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public QrCheckinService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<QrCheckin>> Select(QrCheckinSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<QrCheckin>> SelectTransaction(IDb db, QrCheckinSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""customerId"", customer, phone, ""staffId"", staff, ""billAmount"", ""rewardEarned"", verification, status, ""visitAt"", createdby, createdon, updatedby, updatedon
                FROM ""qrCheckins""
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
                qb.AddParameter("phone", "ILIKE", "search", "%" + req.search + "%", DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<QrCheckin>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<QrCheckin> Insert(QrCheckin entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, QrCheckin entity)
        {
            const string query = @"
                INSERT INTO ""qrCheckins"" (
                    ""orgId"", ""locationId"", ""customerId"", customer, phone, ""staffId"", staff, ""billAmount"", ""rewardEarned"", verification, status, ""visitAt"", createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @customerId, @customer, @phone, @staffId, @staff, @billAmount, @rewardEarned, @verification, @status, @visitAt, @createdby, @createdon, @updatedby, @updatedon
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

        public async Task<QrCheckin> Update(QrCheckin entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, QrCheckin entity)
        {
            const string query = @"
                UPDATE ""qrCheckins"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""customerId"" = @customerId,
                    customer = @customer,
                    phone = @phone,
                    ""staffId"" = @staffId,
                    staff = @staff,
                    ""billAmount"" = @billAmount,
                    ""rewardEarned"" = @rewardEarned,
                    verification = @verification,
                    status = @status,
                    ""visitAt"" = @visitAt,
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

        public async Task<bool> Delete(QrCheckinDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, QrCheckinDeleteReq req)
        {
            const string query = @"
                UPDATE ""qrCheckins""
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

        private static QrCheckin Map(DbDataReader reader)
        {
            return new QrCheckin
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                customerId = ReadLong(reader, "customerId"),
                customer = reader["customer"]?.ToString() ?? "",
                phone = reader["phone"]?.ToString() ?? "",
                staffId = ReadLong(reader, "staffId"),
                staff = reader["staff"]?.ToString() ?? "",
                billAmount = ReadDecimal(reader, "billAmount"),
                rewardEarned = reader["rewardEarned"]?.ToString() ?? "",
                verification = reader["verification"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                visitAt = reader["visitAt"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, QrCheckin entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "customer", DbTypes.Types.String).Value = entity.customer ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = entity.phone ?? "";
            db.AddParameter(cmd, "staffId", DbTypes.Types.Long).Value = entity.staffId;
            db.AddParameter(cmd, "staff", DbTypes.Types.String).Value = entity.staff ?? "";
            db.AddParameter(cmd, "billAmount", DbTypes.Types.Decimal).Value = entity.billAmount;
            db.AddParameter(cmd, "rewardEarned", DbTypes.Types.String).Value = entity.rewardEarned ?? "";
            db.AddParameter(cmd, "verification", DbTypes.Types.String).Value = entity.verification ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "visitAt", DbTypes.Types.String).Value = entity.visitAt ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
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
