using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class QrOfferRedemptionService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public QrOfferRedemptionService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<QrOfferRedemption>> Select(QrOfferRedemptionSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<QrOfferRedemption>> SelectTransaction(IDb db, QrOfferRedemptionSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""offerId"", ""customerId"", ""checkinId"", ""invoiceId"", status, ""discountAmount"", ""issuedAt"", ""redeemedAt"", ""offerTitle"", ""offerType""
                FROM ""qrOfferRedemptions""
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

            var result = new List<QrOfferRedemption>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<QrOfferRedemption> Insert(QrOfferRedemption entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, QrOfferRedemption entity)
        {
            const string query = @"
                INSERT INTO ""qrOfferRedemptions"" (
                    ""orgId"", ""locationId"", ""offerId"", ""customerId"", ""checkinId"", ""invoiceId"", status, ""discountAmount"", ""issuedAt"", ""redeemedAt"", ""offerTitle"", ""offerType""
                )
                VALUES (
                    @orgId, @locationId, @offerId, @customerId, @checkinId, @invoiceId, @status, @discountAmount, @issuedAt, @redeemedAt, @offerTitle, @offerType
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

        public async Task<QrOfferRedemption> Update(QrOfferRedemption entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, QrOfferRedemption entity)
        {
            const string query = @"
                UPDATE ""qrOfferRedemptions"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""offerId"" = @offerId,
                    ""customerId"" = @customerId,
                    ""checkinId"" = @checkinId,
                    ""invoiceId"" = @invoiceId,
                    status = @status,
                    ""discountAmount"" = @discountAmount,
                    ""issuedAt"" = @issuedAt,
                    ""redeemedAt"" = @redeemedAt,
                    ""offerTitle"" = @offerTitle,
                    ""offerType"" = @offerType
                WHERE id = @id
            ";

            
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(QrOfferRedemptionDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, QrOfferRedemptionDeleteReq req)
        {
            const string query = @"
                UPDATE ""qrOfferRedemptions""
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

        private static QrOfferRedemption Map(DbDataReader reader)
        {
            return new QrOfferRedemption
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                offerId = ReadLong(reader, "offerId"),
                customerId = ReadLong(reader, "customerId"),
                checkinId = ReadLong(reader, "checkinId"),
                invoiceId = ReadLong(reader, "invoiceId"),
                status = reader["status"]?.ToString() ?? "",
                discountAmount = ReadDecimal(reader, "discountAmount"),
                issuedAt = reader["issuedAt"]?.ToString() ?? "",
                redeemedAt = reader["redeemedAt"]?.ToString() ?? "",
                offerTitle = reader["offerTitle"]?.ToString() ?? "",
                offerType = reader["offerType"]?.ToString() ?? "",
            };
        }

        private static void Bind(DbCommand cmd, IDb db, QrOfferRedemption entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "offerId", DbTypes.Types.Long).Value = entity.offerId;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "checkinId", DbTypes.Types.Long).Value = entity.checkinId;
            db.AddParameter(cmd, "invoiceId", DbTypes.Types.Long).Value = entity.invoiceId;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "discountAmount", DbTypes.Types.Decimal).Value = entity.discountAmount;
            db.AddParameter(cmd, "issuedAt", DbTypes.Types.String).Value = entity.issuedAt ?? "";
            db.AddParameter(cmd, "redeemedAt", DbTypes.Types.String).Value = entity.redeemedAt ?? "";
            db.AddParameter(cmd, "offerTitle", DbTypes.Types.String).Value = entity.offerTitle ?? "";
            db.AddParameter(cmd, "offerType", DbTypes.Types.String).Value = entity.offerType ?? "";
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
