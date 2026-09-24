using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class PartnershipService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public PartnershipService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Partnership>> Select(PartnershipSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Partnership>> SelectTransaction(IDb db, PartnershipSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""partnerName"", status, ""outboundOffer"", ""inboundOffer"", issued, redeemed
                FROM partnerships
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

            var result = new List<Partnership>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Partnership> Insert(Partnership entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Partnership entity)
        {
            const string query = @"
                INSERT INTO partnerships (
                    ""orgId"", ""locationId"", ""partnerName"", status, ""outboundOffer"", ""inboundOffer"", issued, redeemed
                )
                VALUES (
                    @orgId, @locationId, @partnerName, @status, @outboundOffer, @inboundOffer, @issued, @redeemed
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
            entity.status = string.IsNullOrWhiteSpace(entity.status) ? "Active" : entity.status;

            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: false);

            using var reader = await db.Execute(cmd);
            if (await reader.ReadAsync())
                entity.id = Convert.ToInt64(reader["id"]);
        }

        public async Task<Partnership> Update(Partnership entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Partnership entity)
        {
            const string query = @"
                UPDATE partnerships SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""partnerName"" = @partnerName,
                    status = @status,
                    ""outboundOffer"" = @outboundOffer,
                    ""inboundOffer"" = @inboundOffer,
                    issued = @issued,
                    redeemed = @redeemed
                WHERE id = @id
            ";

            
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(PartnershipDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, PartnershipDeleteReq req)
        {
            const string query = @"
                UPDATE partnerships
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

        private static Partnership Map(DbDataReader reader)
        {
            return new Partnership
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                partnerName = reader["partnerName"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                outboundOffer = reader["outboundOffer"]?.ToString() ?? "",
                inboundOffer = reader["inboundOffer"]?.ToString() ?? "",
                issued = ReadLong(reader, "issued"),
                redeemed = ReadLong(reader, "redeemed"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Partnership entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "partnerName", DbTypes.Types.String).Value = entity.partnerName ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "outboundOffer", DbTypes.Types.String).Value = entity.outboundOffer ?? "";
            db.AddParameter(cmd, "inboundOffer", DbTypes.Types.String).Value = entity.inboundOffer ?? "";
            db.AddParameter(cmd, "issued", DbTypes.Types.Long).Value = entity.issued;
            db.AddParameter(cmd, "redeemed", DbTypes.Types.Long).Value = entity.redeemed;
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
