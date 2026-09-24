using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class MembershipUsageService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public MembershipUsageService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<MembershipUsage>> Select(MembershipUsageSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<MembershipUsage>> SelectTransaction(IDb db, MembershipUsageSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""customerId"", ""membershipId"", ""planId"", ""invoiceId"", ""serviceId"", ""serviceName"", quantity, type, status, ""usedOn"", createdby, createdon, updatedby, updatedon
                FROM ""membershipUsage""
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

            var result = new List<MembershipUsage>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<MembershipUsage> Insert(MembershipUsage entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, MembershipUsage entity)
        {
            const string query = @"
                INSERT INTO ""membershipUsage"" (
                    ""orgId"", ""locationId"", ""customerId"", ""membershipId"", ""planId"", ""invoiceId"", ""serviceId"", ""serviceName"", quantity, type, status, ""usedOn"", createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @customerId, @membershipId, @planId, @invoiceId, @serviceId, @serviceName, @quantity, @type, @status, @usedOn, @createdby, @createdon, @updatedby, @updatedon
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

        public async Task<MembershipUsage> Update(MembershipUsage entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, MembershipUsage entity)
        {
            const string query = @"
                UPDATE ""membershipUsage"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""customerId"" = @customerId,
                    ""membershipId"" = @membershipId,
                    ""planId"" = @planId,
                    ""invoiceId"" = @invoiceId,
                    ""serviceId"" = @serviceId,
                    ""serviceName"" = @serviceName,
                    quantity = @quantity,
                    type = @type,
                    status = @status,
                    ""usedOn"" = @usedOn,
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

        public async Task<bool> Delete(MembershipUsageDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, MembershipUsageDeleteReq req)
        {
            const string query = @"
                UPDATE ""membershipUsage""
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

        private static MembershipUsage Map(DbDataReader reader)
        {
            return new MembershipUsage
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                customerId = ReadLong(reader, "customerId"),
                membershipId = ReadLong(reader, "membershipId"),
                planId = ReadLong(reader, "planId"),
                invoiceId = ReadLong(reader, "invoiceId"),
                serviceId = ReadLong(reader, "serviceId"),
                serviceName = reader["serviceName"]?.ToString() ?? "",
                quantity = ReadDecimal(reader, "quantity"),
                type = reader["type"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                usedOn = ReadDate(reader, "usedOn"),
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, MembershipUsage entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "membershipId", DbTypes.Types.Long).Value = entity.membershipId;
            db.AddParameter(cmd, "planId", DbTypes.Types.Long).Value = entity.planId;
            db.AddParameter(cmd, "invoiceId", DbTypes.Types.Long).Value = entity.invoiceId;
            db.AddParameter(cmd, "serviceId", DbTypes.Types.Long).Value = entity.serviceId;
            db.AddParameter(cmd, "serviceName", DbTypes.Types.String).Value = entity.serviceName ?? "";
            db.AddParameter(cmd, "quantity", DbTypes.Types.Decimal).Value = entity.quantity;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = entity.type ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "usedOn", DbTypes.Types.Date).Value = entity.usedOn ?? DateTime.UtcNow.Date;
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
