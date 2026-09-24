using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class WheelSpinService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public WheelSpinService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<WheelSpin>> Select(WheelSpinSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<WheelSpin>> SelectTransaction(IDb db, WheelSpinSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""customerId"", ""programId"", ""segmentId"", ""rewardType"", ""rewardValue"", label, source, ""referenceId"", ""checkinId"", status, ""createdAt"", ""loyaltyTransactionId"", createdby, createdon, updatedby, updatedon
                FROM ""wheelSpins""
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
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<WheelSpin>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<WheelSpin> Insert(WheelSpin entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, WheelSpin entity)
        {
            const string query = @"
                INSERT INTO ""wheelSpins"" (
                    ""orgId"", ""locationId"", ""customerId"", ""programId"", ""segmentId"", ""rewardType"", ""rewardValue"", label, source, ""referenceId"", ""checkinId"", status, ""createdAt"", ""loyaltyTransactionId"", createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @customerId, @programId, @segmentId, @rewardType, @rewardValue, @label, @source, @referenceId, @checkinId, @status, @createdAt, @loyaltyTransactionId, @createdby, @createdon, @updatedby, @updatedon
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

        public async Task<WheelSpin> Update(WheelSpin entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, WheelSpin entity)
        {
            const string query = @"
                UPDATE ""wheelSpins"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""customerId"" = @customerId,
                    ""programId"" = @programId,
                    ""segmentId"" = @segmentId,
                    ""rewardType"" = @rewardType,
                    ""rewardValue"" = @rewardValue,
                    label = @label,
                    source = @source,
                    ""referenceId"" = @referenceId,
                    ""checkinId"" = @checkinId,
                    status = @status,
                    ""createdAt"" = @createdAt,
                    ""loyaltyTransactionId"" = @loyaltyTransactionId,
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

        public async Task<bool> Delete(WheelSpinDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, WheelSpinDeleteReq req)
        {
            const string query = @"
                UPDATE ""wheelSpins""
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

        private static WheelSpin Map(DbDataReader reader)
        {
            return new WheelSpin
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                customerId = ReadLong(reader, "customerId"),
                programId = ReadLong(reader, "programId"),
                segmentId = ReadLong(reader, "segmentId"),
                rewardType = reader["rewardType"]?.ToString() ?? "",
                rewardValue = ReadLong(reader, "rewardValue"),
                label = reader["label"]?.ToString() ?? "",
                source = reader["source"]?.ToString() ?? "",
                referenceId = ReadLong(reader, "referenceId"),
                checkinId = ReadLong(reader, "checkinId"),
                status = reader["status"]?.ToString() ?? "",
                createdAt = ReadDate(reader, "createdAt"),
                loyaltyTransactionId = ReadLong(reader, "loyaltyTransactionId"),
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, WheelSpin entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "programId", DbTypes.Types.Long).Value = entity.programId;
            db.AddParameter(cmd, "segmentId", DbTypes.Types.Long).Value = entity.segmentId;
            db.AddParameter(cmd, "rewardType", DbTypes.Types.String).Value = entity.rewardType ?? "";
            db.AddParameter(cmd, "rewardValue", DbTypes.Types.Long).Value = entity.rewardValue;
            db.AddParameter(cmd, "label", DbTypes.Types.String).Value = entity.label ?? "";
            db.AddParameter(cmd, "source", DbTypes.Types.String).Value = entity.source ?? "";
            db.AddParameter(cmd, "referenceId", DbTypes.Types.Long).Value = entity.referenceId;
            db.AddParameter(cmd, "checkinId", DbTypes.Types.Long).Value = entity.checkinId;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "createdAt", DbTypes.Types.Date).Value = entity.createdAt ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "loyaltyTransactionId", DbTypes.Types.Long).Value = entity.loyaltyTransactionId;
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

        public async Task<bool> RedeemAtPosTransaction(IDb db, long spinId, long invoiceId)
        {
            if (spinId <= 0) return false;
            var rows = await SelectTransaction(db, new WheelSpinSelectReq { id = spinId });
            var spin = rows.FirstOrDefault();
            if (spin == null || !string.Equals(spin.status, "Pending", StringComparison.OrdinalIgnoreCase)) return false;
            spin.status = "Redeemed";
            spin.referenceId = invoiceId;
            return await UpdateTransaction(db, spin);
        }

        public decimal WheelSpinDiscountAmount(WheelSpin spin, decimal subtotal)
        {
            if (string.Equals(spin.rewardType, "Flat discount", StringComparison.OrdinalIgnoreCase))
                return Math.Min(spin.rewardValue, subtotal);
            if (string.Equals(spin.rewardType, "Percentage discount", StringComparison.OrdinalIgnoreCase))
                return Math.Round(subtotal * (spin.rewardValue / 100m), 0);
            return 0;
        }
    }
}
