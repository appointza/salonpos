using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class QrOfferService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public QrOfferService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<QrOffer>> Select(QrOfferSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<QrOffer>> SelectTransaction(IDb db, QrOfferSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", title, description, ""offerType"", ""eligibleSegment"", ""validityStart"", ""validityEnd"", status, ""buyQty"", ""freeQty"", ""serviceName""
                FROM ""qrOffers""
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
                qb.AddParameter("title", "ILIKE", "search", "%" + req.search + "%", DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<QrOffer>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<QrOffer> Insert(QrOffer entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, QrOffer entity)
        {
            const string query = @"
                INSERT INTO ""qrOffers"" (
                    ""orgId"", ""locationId"", title, description, ""offerType"", ""eligibleSegment"", ""validityStart"", ""validityEnd"", status, ""buyQty"", ""freeQty"", ""serviceName""
                )
                VALUES (
                    @orgId, @locationId, @title, @description, @offerType, @eligibleSegment, @validityStart, @validityEnd, @status, @buyQty, @freeQty, @serviceName
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

        public async Task<QrOffer> Update(QrOffer entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, QrOffer entity)
        {
            const string query = @"
                UPDATE ""qrOffers"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    title = @title,
                    description = @description,
                    ""offerType"" = @offerType,
                    ""eligibleSegment"" = @eligibleSegment,
                    ""validityStart"" = @validityStart,
                    ""validityEnd"" = @validityEnd,
                    status = @status,
                    ""buyQty"" = @buyQty,
                    ""freeQty"" = @freeQty,
                    ""serviceName"" = @serviceName
                WHERE id = @id
            ";

            
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(QrOfferDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, QrOfferDeleteReq req)
        {
            const string query = @"
                UPDATE ""qrOffers""
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

        private static QrOffer Map(DbDataReader reader)
        {
            return new QrOffer
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                title = reader["title"]?.ToString() ?? "",
                description = reader["description"]?.ToString() ?? "",
                offerType = reader["offerType"]?.ToString() ?? "",
                eligibleSegment = reader["eligibleSegment"]?.ToString() ?? "",
                validityStart = ReadDate(reader, "validityStart"),
                validityEnd = ReadDate(reader, "validityEnd"),
                status = reader["status"]?.ToString() ?? "",
                buyQty = ReadDecimal(reader, "buyQty"),
                freeQty = ReadDecimal(reader, "freeQty"),
                serviceName = reader["serviceName"]?.ToString() ?? "",
            };
        }

        private static void Bind(DbCommand cmd, IDb db, QrOffer entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "title", DbTypes.Types.String).Value = entity.title ?? "";
            db.AddParameter(cmd, "description", DbTypes.Types.String).Value = entity.description ?? "";
            db.AddParameter(cmd, "offerType", DbTypes.Types.String).Value = entity.offerType ?? "";
            db.AddParameter(cmd, "eligibleSegment", DbTypes.Types.String).Value = entity.eligibleSegment ?? "";
            db.AddParameter(cmd, "validityStart", DbTypes.Types.Date).Value = entity.validityStart ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "validityEnd", DbTypes.Types.Date).Value = entity.validityEnd ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "buyQty", DbTypes.Types.Decimal).Value = entity.buyQty;
            db.AddParameter(cmd, "freeQty", DbTypes.Types.Decimal).Value = entity.freeQty;
            db.AddParameter(cmd, "serviceName", DbTypes.Types.String).Value = entity.serviceName ?? "";
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
