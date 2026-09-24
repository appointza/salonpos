using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class LoyaltyTransactionService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;

        public LoyaltyTransactionService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
        }

        public async Task<List<LoyaltyTransaction>> Select(LoyaltyTransactionSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<LoyaltyTransaction>> SelectTransaction(IDb db, LoyaltyTransactionSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", ""customerId"", ""invoiceId"", ""programId"", type, points, source, ""referenceId"", ""balanceBefore"", ""balanceAfter"", reason, ""expiresOn"", status, createdby, createdon, updatedby, updatedon
                FROM ""loyaltyTransactions""
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);
            if (req.customerId > 0)
                qb.AddParameter(@"""customerId""", "=", "customerId", req.customerId, DbTypes.Types.Long);

            if (!string.IsNullOrWhiteSpace(req.status))
                qb.AddParameter("status", "=", "status", req.status, DbTypes.Types.String);
            else
                qb.AddParameter("status", "<>", "status", "Inactive", DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<LoyaltyTransaction>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<LoyaltyTransaction> Insert(LoyaltyTransaction entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, LoyaltyTransaction entity)
        {
            const string query = @"
                INSERT INTO ""loyaltyTransactions"" (
                    ""orgId"", ""locationId"", ""customerId"", ""invoiceId"", ""programId"", type, points, source, ""referenceId"", ""balanceBefore"", ""balanceAfter"", reason, ""expiresOn"", status, createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @customerId, @invoiceId, @programId, @type, @points, @source, @referenceId, @balanceBefore, @balanceAfter, @reason, @expiresOn, @status, @createdby, @createdon, @updatedby, @updatedon
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

        public async Task<LoyaltyTransaction> Update(LoyaltyTransaction entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, LoyaltyTransaction entity)
        {
            const string query = @"
                UPDATE ""loyaltyTransactions"" SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    ""customerId"" = @customerId,
                    ""invoiceId"" = @invoiceId,
                    ""programId"" = @programId,
                    type = @type,
                    points = @points,
                    source = @source,
                    ""referenceId"" = @referenceId,
                    ""balanceBefore"" = @balanceBefore,
                    ""balanceAfter"" = @balanceAfter,
                    reason = @reason,
                    ""expiresOn"" = @expiresOn,
                    status = @status,
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

        public async Task<bool> Delete(LoyaltyTransactionDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, LoyaltyTransactionDeleteReq req)
        {
            const string query = @"
                UPDATE ""loyaltyTransactions""
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

        private static LoyaltyTransaction Map(DbDataReader reader)
        {
            return new LoyaltyTransaction
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                customerId = ReadLong(reader, "customerId"),
                invoiceId = ReadLong(reader, "invoiceId"),
                programId = ReadLong(reader, "programId"),
                type = reader["type"]?.ToString() ?? "",
                points = ReadLong(reader, "points"),
                source = reader["source"]?.ToString() ?? "",
                referenceId = ReadLong(reader, "referenceId"),
                balanceBefore = ReadDecimal(reader, "balanceBefore"),
                balanceAfter = ReadDecimal(reader, "balanceAfter"),
                reason = reader["reason"]?.ToString() ?? "",
                expiresOn = ReadDate(reader, "expiresOn"),
                status = reader["status"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, LoyaltyTransaction entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "invoiceId", DbTypes.Types.Long).Value = entity.invoiceId;
            db.AddParameter(cmd, "programId", DbTypes.Types.Long).Value = entity.programId;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = entity.type ?? "";
            db.AddParameter(cmd, "points", DbTypes.Types.Long).Value = entity.points;
            db.AddParameter(cmd, "source", DbTypes.Types.String).Value = entity.source ?? "";
            db.AddParameter(cmd, "referenceId", DbTypes.Types.Long).Value = entity.referenceId;
            db.AddParameter(cmd, "balanceBefore", DbTypes.Types.Decimal).Value = entity.balanceBefore;
            db.AddParameter(cmd, "balanceAfter", DbTypes.Types.Decimal).Value = entity.balanceAfter;
            db.AddParameter(cmd, "reason", DbTypes.Types.String).Value = entity.reason ?? "";
            db.AddParameter(cmd, "expiresOn", DbTypes.Types.Date).Value = entity.expiresOn ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
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

        public async Task<LoyaltyPostPointsRes> PostPointsTransaction(IDb db, LoyaltyPostPointsReq req)
        {
            var res = new LoyaltyPostPointsRes();
            if (req.points <= 0)
            {
                res.errorMessage = "Zero points";
                return res;
            }

            if (await HasPointsTransaction(db, req.source, req.referenceId, req.type))
            {
                res.duplicate = true;
                res.balanceAfter = await GetCustomerPoints(db, req.customerId);
                return res;
            }

            var before = await GetCustomerPoints(db, req.customerId);
            long after = before;
            if (string.Equals(req.type, "Redeem", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(req.type, "Expire", StringComparison.OrdinalIgnoreCase))
            {
                if (req.points > before)
                {
                    res.errorMessage = "Insufficient points";
                    res.balanceAfter = before;
                    return res;
                }
                after = before - req.points;
            }
            else
            {
                after = before + req.points;
            }

            var tx = new LoyaltyTransaction
            {
                orgId = req.orgId,
                locationId = req.locationId,
                customerId = req.customerId,
                invoiceId = req.invoiceId > 0 ? req.invoiceId : req.referenceId,
                programId = req.programId,
                type = req.type,
                points = req.points,
                source = req.source,
                referenceId = req.referenceId,
                balanceBefore = before,
                balanceAfter = after,
                reason = req.reason,
                expiresOn = req.expiresOn,
                status = "Posted",
            };
            await InsertTransaction(db, tx);

            var update = db.GetCommand(@"UPDATE customers SET points = @points, updatedon = @updatedon WHERE id = @id");
            db.AddParameter(update, "points", DbTypes.Types.Long).Value = after;
            db.AddParameter(update, "updatedon", DbTypes.Types.Date).Value = DateTime.UtcNow.Date;
            db.AddParameter(update, "id", DbTypes.Types.Long).Value = req.customerId;
            await db.ExecuteNonQuery(update);

            res.ok = true;
            res.balanceAfter = after;
            return res;
        }

        public async Task<LoyaltyPostPointsRes> ReverseForInvoiceTransaction(IDb db, LoyaltyReversalReq req)
        {
            var res = new LoyaltyPostPointsRes();
            var txs = await SelectTransaction(db, new LoyaltyTransactionSelectReq
            {
                orgId = req.orgId,
                locationId = req.locationId,
            });
            var earn = txs.FirstOrDefault(t =>
                t.invoiceId == req.invoiceId &&
                string.Equals(t.type, "Earn", StringComparison.OrdinalIgnoreCase));
            var redeem = txs.FirstOrDefault(t =>
                t.invoiceId == req.invoiceId &&
                string.Equals(t.type, "Redeem", StringComparison.OrdinalIgnoreCase));

            long balance = await GetCustomerPoints(db, req.customerId);
            if (earn != null && earn.points > 0)
            {
                var expire = await PostPointsTransaction(db, new LoyaltyPostPointsReq
                {
                    orgId = req.orgId,
                    locationId = req.locationId,
                    customerId = req.customerId,
                    type = "Expire",
                    points = Math.Min(earn.points, balance),
                    source = "reversal",
                    referenceId = req.invoiceId * 10 + 1,
                    invoiceId = req.invoiceId,
                    programId = earn.programId,
                    reason = req.reason,
                });
                if (expire.ok) balance = expire.balanceAfter;
            }
            if (redeem != null && redeem.points > 0)
            {
                var reverse = await PostPointsTransaction(db, new LoyaltyPostPointsReq
                {
                    orgId = req.orgId,
                    locationId = req.locationId,
                    customerId = req.customerId,
                    type = "Reverse",
                    points = redeem.points,
                    source = "reversal",
                    referenceId = req.invoiceId * 10 + 2,
                    invoiceId = req.invoiceId,
                    programId = redeem.programId,
                    reason = req.reason,
                });
                if (reverse.ok) balance = reverse.balanceAfter;
            }

            res.ok = true;
            res.balanceAfter = balance;
            return res;
        }

        private static async Task<bool> HasPointsTransaction(IDb db, string source, long referenceId, string type)
        {
            const string query = @"
                SELECT 1 FROM ""loyaltyTransactions"" lt
                WHERE lt.source = @source AND lt.""referenceId"" = @referenceId AND lt.type = @type
                LIMIT 1";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "source", DbTypes.Types.String).Value = source;
            db.AddParameter(cmd, "referenceId", DbTypes.Types.Long).Value = referenceId;
            db.AddParameter(cmd, "type", DbTypes.Types.String).Value = type;
            using var reader = await db.Execute(cmd);
            return await reader.ReadAsync();
        }

        private static async Task<long> GetCustomerPoints(IDb db, long customerId)
        {
            var cmd = db.GetCommand("SELECT points FROM customers WHERE id = @id LIMIT 1");
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = customerId;
            using var reader = await db.Execute(cmd);
            if (!await reader.ReadAsync()) return 0;
            return ReadLong(reader, "points");
        }
    }
}
