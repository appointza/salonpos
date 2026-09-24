using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class CommissionService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public CommissionService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Commission>> Select(CommissionSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Commission>> SelectTransaction(IDb db, CommissionSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", type, ""baseAmount"", rate, amount, date, status, createdby, createdon, updatedby, updatedon, ""staffId"", ""invoiceId"", ""serviceId"", item
                FROM commissions
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

            var result = new List<Commission>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Commission> Insert(Commission entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Commission entity)
        {
            const string query = @"
                INSERT INTO commissions (
                    ""orgId"", ""locationId"", type, ""baseAmount"", rate, amount, date, status, createdby, createdon, updatedby, updatedon, ""staffId"", ""invoiceId"", ""serviceId"", item
                )
                VALUES (
                    @orgId, @locationId, @type, @baseAmount, @rate, @amount, @date, @status, @createdby, @createdon, @updatedby, @updatedon, @staffId, @invoiceId, @serviceId, @item
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

        public async Task<Commission> Update(Commission entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Commission entity)
        {
            const string query = @"
                UPDATE commissions SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    type = @type,
                    ""baseAmount"" = @baseAmount,
                    rate = @rate,
                    amount = @amount,
                    date = @date,
                    status = @status,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon,
                    ""staffId"" = @staffId,
                    ""invoiceId"" = @invoiceId,
                    ""serviceId"" = @serviceId,
                    item = @item
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(CommissionDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, CommissionDeleteReq req)
        {
            const string query = @"
                UPDATE commissions
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

        private static Commission Map(DbDataReader reader)
        {
            return new Commission
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                type = reader["type"]?.ToString() ?? "",
                baseAmount = ReadDecimal(reader, "baseAmount"),
                rate = ReadDecimal(reader, "rate"),
                amount = ReadDecimal(reader, "amount"),
                date = ReadDate(reader, "date"),
                status = reader["status"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
                staffId = ReadLong(reader, "staffId"),
                invoiceId = ReadLong(reader, "invoiceId"),
                serviceId = ReadLong(reader, "serviceId"),
                item = reader["item"]?.ToString() ?? "",
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Commission entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = entity.type ?? "";
            db.AddParameter(cmd, "baseAmount", DbTypes.Types.Decimal).Value = entity.baseAmount;
            db.AddParameter(cmd, "rate", DbTypes.Types.Decimal).Value = entity.rate;
            db.AddParameter(cmd, "amount", DbTypes.Types.Decimal).Value = entity.amount;
            db.AddParameter(cmd, "date", DbTypes.Types.Date).Value = entity.date ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "staffId", DbTypes.Types.Long).Value = entity.staffId;
            db.AddParameter(cmd, "invoiceId", DbTypes.Types.Long).Value = entity.invoiceId;
            db.AddParameter(cmd, "serviceId", DbTypes.Types.Long).Value = entity.serviceId;
            db.AddParameter(cmd, "item", DbTypes.Types.String).Value = entity.item ?? "";
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
