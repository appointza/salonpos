using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class VoucherService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public VoucherService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<Voucher>> Select(VoucherSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Voucher>> SelectTransaction(IDb db, VoucherSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""couponId"", code, ""voucherType"", amount, ""issueTo"", ""customerId"", ""billId"", ""invoiceId"", status, unlimited, ""issuedAt"", ""redeemedAt"", ""schemeCode"", ""schemeTitle"", ""poolIndex"", ""poolGenerated"", ""discountAmount"", ""redeemedLocationId"", createdby, createdon, updatedby, updatedon
                FROM vouchers
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
                qb.AddParameter("code", "ILIKE", "search", "%" + req.search + "%", DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<Voucher>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Voucher> Insert(Voucher entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Voucher entity)
        {
            const string query = @"
                INSERT INTO vouchers (
                    ""orgId"", ""locationId"", ""couponId"", code, ""voucherType"", amount, ""issueTo"", ""customerId"", ""billId"", ""invoiceId"", status, unlimited, ""issuedAt"", ""redeemedAt"", ""schemeCode"", ""schemeTitle"", ""poolIndex"", ""poolGenerated"", ""discountAmount"", ""redeemedLocationId"", createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @couponId, @code, @voucherType, @amount, @issueTo, @customerId, @billId, @invoiceId, @status, @unlimited, @issuedAt, @redeemedAt, @schemeCode, @schemeTitle, @poolIndex, @poolGenerated, @discountAmount, @redeemedLocationId, @createdby, @createdon, @updatedby, @updatedon
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

        public async Task<Voucher> Update(Voucher entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Voucher entity)
        {
            const string query = @"
                UPDATE vouchers SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""couponId"" = @couponId,
                    code = @code,
                    ""voucherType"" = @voucherType,
                    amount = @amount,
                    ""issueTo"" = @issueTo,
                    ""customerId"" = @customerId,
                    ""billId"" = @billId,
                    ""invoiceId"" = @invoiceId,
                    status = @status,
                    unlimited = @unlimited,
                    ""issuedAt"" = @issuedAt,
                    ""redeemedAt"" = @redeemedAt,
                    ""schemeCode"" = @schemeCode,
                    ""schemeTitle"" = @schemeTitle,
                    ""poolIndex"" = @poolIndex,
                    ""poolGenerated"" = @poolGenerated,
                    ""discountAmount"" = @discountAmount,
                    ""redeemedLocationId"" = @redeemedLocationId,
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

        public async Task<bool> Delete(VoucherDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, VoucherDeleteReq req)
        {
            const string query = @"
                UPDATE vouchers
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

        private static Voucher Map(DbDataReader reader)
        {
            return new Voucher
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                couponId = ReadLong(reader, "couponId"),
                code = reader["code"]?.ToString() ?? "",
                voucherType = reader["voucherType"]?.ToString() ?? "",
                amount = ReadDecimal(reader, "amount"),
                issueTo = reader["issueTo"]?.ToString() ?? "",
                customerId = ReadLong(reader, "customerId"),
                billId = ReadLong(reader, "billId"),
                invoiceId = ReadLong(reader, "invoiceId"),
                status = reader["status"]?.ToString() ?? "",
                unlimited = reader["unlimited"]?.ToString() ?? "",
                issuedAt = reader["issuedAt"]?.ToString() ?? "",
                redeemedAt = reader["redeemedAt"]?.ToString() ?? "",
                schemeCode = reader["schemeCode"]?.ToString() ?? "",
                schemeTitle = reader["schemeTitle"]?.ToString() ?? "",
                poolIndex = ReadLong(reader, "poolIndex"),
                poolGenerated = reader["poolGenerated"]?.ToString() ?? "",
                discountAmount = ReadDecimal(reader, "discountAmount"),
                redeemedLocationId = ReadLong(reader, "redeemedLocationId"),
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Voucher entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "couponId", DbTypes.Types.Long).Value = entity.couponId;
            db.AddParameter(cmd, "code", DbTypes.Types.String).Value = entity.code ?? "";
            db.AddParameter(cmd, "voucherType", DbTypes.Types.String).Value = entity.voucherType ?? "";
            db.AddParameter(cmd, "amount", DbTypes.Types.Decimal).Value = entity.amount;
            db.AddParameter(cmd, "issueTo", DbTypes.Types.String).Value = entity.issueTo ?? "";
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "billId", DbTypes.Types.Long).Value = entity.billId;
            db.AddParameter(cmd, "invoiceId", DbTypes.Types.Long).Value = entity.invoiceId;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "unlimited", DbTypes.Types.String).Value = entity.unlimited ?? "";
            db.AddParameter(cmd, "issuedAt", DbTypes.Types.String).Value = entity.issuedAt ?? "";
            db.AddParameter(cmd, "redeemedAt", DbTypes.Types.String).Value = entity.redeemedAt ?? "";
            db.AddParameter(cmd, "schemeCode", DbTypes.Types.String).Value = entity.schemeCode ?? "";
            db.AddParameter(cmd, "schemeTitle", DbTypes.Types.String).Value = entity.schemeTitle ?? "";
            db.AddParameter(cmd, "poolIndex", DbTypes.Types.Long).Value = entity.poolIndex;
            db.AddParameter(cmd, "poolGenerated", DbTypes.Types.String).Value = entity.poolGenerated ?? "";
            db.AddParameter(cmd, "discountAmount", DbTypes.Types.Decimal).Value = entity.discountAmount;
            db.AddParameter(cmd, "redeemedLocationId", DbTypes.Types.Long).Value = entity.redeemedLocationId;
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
