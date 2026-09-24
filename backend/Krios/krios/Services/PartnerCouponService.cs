using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class PartnerCouponService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public PartnerCouponService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<PartnerCoupon>> Select(PartnerCouponSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<PartnerCoupon>> SelectTransaction(IDb db, PartnerCouponSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""partnerId"", ""customerId"", direction, offer, ""couponCode"", status, ""issuedAt"", ""redeemedAt"", ""invoiceId""
                FROM ""partnerCoupons""
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

            var result = new List<PartnerCoupon>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<PartnerCoupon> Insert(PartnerCoupon entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, PartnerCoupon entity)
        {
            const string query = @"
                INSERT INTO ""partnerCoupons"" (
                    ""orgId"", ""locationId"", ""partnerId"", ""customerId"", direction, offer, ""couponCode"", status, ""issuedAt"", ""redeemedAt"", ""invoiceId""
                )
                VALUES (
                    @orgId, @locationId, @partnerId, @customerId, @direction, @offer, @couponCode, @status, @issuedAt, @redeemedAt, @invoiceId
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

        public async Task<PartnerCoupon> Update(PartnerCoupon entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, PartnerCoupon entity)
        {
            const string query = @"
                UPDATE ""partnerCoupons"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""partnerId"" = @partnerId,
                    ""customerId"" = @customerId,
                    direction = @direction,
                    offer = @offer,
                    ""couponCode"" = @couponCode,
                    status = @status,
                    ""issuedAt"" = @issuedAt,
                    ""redeemedAt"" = @redeemedAt,
                    ""invoiceId"" = @invoiceId
                WHERE id = @id
            ";

            
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(PartnerCouponDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, PartnerCouponDeleteReq req)
        {
            const string query = @"
                UPDATE ""partnerCoupons""
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

        private static PartnerCoupon Map(DbDataReader reader)
        {
            return new PartnerCoupon
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                partnerId = ReadLong(reader, "partnerId"),
                customerId = ReadLong(reader, "customerId"),
                direction = reader["direction"]?.ToString() ?? "",
                offer = reader["offer"]?.ToString() ?? "",
                couponCode = reader["couponCode"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                issuedAt = reader["issuedAt"]?.ToString() ?? "",
                redeemedAt = reader["redeemedAt"]?.ToString() ?? "",
                invoiceId = ReadLong(reader, "invoiceId"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, PartnerCoupon entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "partnerId", DbTypes.Types.Long).Value = entity.partnerId;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "direction", DbTypes.Types.String).Value = entity.direction ?? "";
            db.AddParameter(cmd, "offer", DbTypes.Types.String).Value = entity.offer ?? "";
            db.AddParameter(cmd, "couponCode", DbTypes.Types.String).Value = entity.couponCode ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "issuedAt", DbTypes.Types.String).Value = entity.issuedAt ?? "";
            db.AddParameter(cmd, "redeemedAt", DbTypes.Types.String).Value = entity.redeemedAt ?? "";
            db.AddParameter(cmd, "invoiceId", DbTypes.Types.Long).Value = entity.invoiceId;
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
