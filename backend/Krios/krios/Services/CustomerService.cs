using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class CustomerService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;
        private readonly LoyaltyTransactionService loyaltyTransactionService;

        public CustomerService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            LoyaltyTransactionService loyaltyTransactionService)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.loyaltyTransactionService = loyaltyTransactionService;
        }

        public async Task<List<Customer>> Select(CustomerSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Customer>> SelectTransaction(IDb db, CustomerSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, phone, email, gender, birthday, anniversary, household, tier, points, ""walletBalance"", outlet, ""lastVisit"", notes, createdby, createdon, updatedby, updatedon, ""membershipId"", ""stampsCurrent"", ""totalVisits"", ""referralCode"", ""marketingConsent""
                FROM customers
            ";

            var qb = querybuilderprovider.GetQueryBuilder(query);

            if (req.id > 0)
                qb.AddParameter("id", "=", "id", req.id, DbTypes.Types.Long);
            if (req.orgId > 0)
                qb.AddParameter(@"""orgId""", "=", "orgId", req.orgId, DbTypes.Types.Long);
            if (req.locationId > 0)
                qb.AddParameter(@"""locationId""", "=", "locationId", req.locationId, DbTypes.Types.Long);

            if (!string.IsNullOrWhiteSpace(req.search))
                qb.AddParameter("name", "ILIKE", "search", "%" + req.search + "%", DbTypes.Types.String);
            qb.AddOrderBy(QueryBuilder.Order.ASC, "id");
            var command = qb.GetCommand(db);

            var result = new List<Customer>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Customer> Insert(Customer entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            var existing = await FindByPhone(db, entity.orgId, entity.phone);
            if (existing != null) return existing;
            await InsertTransaction(db, entity);
            return entity;
        }

        private async Task<Customer?> FindByPhone(IDb db, long orgId, string? phone)
        {
            var digits = PhoneDigits(phone);
            if (orgId <= 0 || digits.Length < 10) return null;

            const string query = @"
                SELECT id
                FROM customers
                WHERE ""orgId"" = @orgId
                  AND RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = @phone
                ORDER BY points DESC, id ASC
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = digits;
            long id;
            using (var reader = await db.Execute(cmd))
            {
                if (!await reader.ReadAsync()) return null;
                id = Convert.ToInt64(reader["id"]);
            }
            var rows = await SelectTransaction(db, new CustomerSelectReq { id = id, orgId = orgId });
            return rows.FirstOrDefault();
        }

        private static string PhoneDigits(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return "";
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            return digits.Length <= 10 ? digits : digits[^10..];
        }

        public async Task InsertTransaction(IDb db, Customer entity)
        {
            const string query = @"
                INSERT INTO customers (
                    ""orgId"", ""locationId"", name, phone, email, gender, birthday, anniversary, household, tier, points, ""walletBalance"", outlet, ""lastVisit"", notes, createdby, createdon, updatedby, updatedon, ""membershipId"", ""stampsCurrent"", ""totalVisits"", ""referralCode"", ""marketingConsent""
                )
                VALUES (
                    @orgId, @locationId, @name, @phone, @email, @gender, @birthday, @anniversary, @household, @tier, @points, @walletBalance, @outlet, @lastVisit, @notes, @createdby, @createdon, @updatedby, @updatedon, @membershipId, @stampsCurrent, @totalVisits, @referralCode, @marketingConsent
                )
                RETURNING id;
            ";

            var today = DateTime.UtcNow.Date;
            var actor = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : "system";
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

        public async Task<Customer> Update(Customer entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Customer entity)
        {
            const string query = @"
                UPDATE customers SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    phone = @phone,
                    email = @email,
                    gender = @gender,
                    birthday = @birthday,
                    anniversary = @anniversary,
                    household = @household,
                    tier = @tier,
                    points = @points,
                    ""walletBalance"" = @walletBalance,
                    outlet = @outlet,
                    ""lastVisit"" = @lastVisit,
                    notes = @notes,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon,
                    ""membershipId"" = @membershipId,
                    ""stampsCurrent"" = @stampsCurrent,
                    ""totalVisits"" = @totalVisits,
                    ""referralCode"" = @referralCode,
                    ""marketingConsent"" = @marketingConsent
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(CustomerDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<CustomerLoyaltySummaryRes> GetLoyaltySummary(CustomerLoyaltySummaryReq req)
        {
            var res = new CustomerLoyaltySummaryRes();
            if (req.orgId <= 0 || req.customerId <= 0)
            {
                res.errorMessage = "orgId and customerId are required";
                return res;
            }

            var customers = await Select(new CustomerSelectReq { id = req.customerId, orgId = req.orgId });
            var customer = customers.FirstOrDefault();
            if (customer == null)
            {
                res.errorMessage = "Customer not found";
                return res;
            }

            var txs = await loyaltyTransactionService.Select(new LoyaltyTransactionSelectReq
            {
                orgId = req.orgId,
                customerId = req.customerId,
            });
            txs = txs.OrderByDescending(t => t.id).ToList();

            long earned = 0;
            long redeemed = 0;
            foreach (var t in txs)
            {
                if (string.Equals(t.type, "Redeem", StringComparison.OrdinalIgnoreCase))
                    redeemed += t.points;
                else if (string.Equals(t.type, "Earn", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(t.type, "Reverse", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(t.type, "Adjust", StringComparison.OrdinalIgnoreCase))
                    earned += t.points;
            }

            res.transactions = txs;
            res.earned = earned;
            res.redeemed = redeemed;
            res.points = txs.Count > 0 ? (long)txs[0].balanceAfter : customer.points;
            return res;
        }

        public async Task<bool> DeleteTransaction(IDb db, CustomerDeleteReq req)
        {
            const string query = @"DELETE FROM customers WHERE id = @id";
            
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = req.id;
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        private static Customer Map(DbDataReader reader)
        {
            return new Customer
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                name = reader["name"]?.ToString() ?? "",
                phone = reader["phone"]?.ToString() ?? "",
                email = reader["email"]?.ToString() ?? "",
                gender = reader["gender"]?.ToString() ?? "",
                birthday = ReadDate(reader, "birthday"),
                anniversary = ReadDate(reader, "anniversary"),
                household = reader["household"]?.ToString() ?? "",
                tier = reader["tier"]?.ToString() ?? "",
                points = ReadLong(reader, "points"),
                walletBalance = ReadDecimal(reader, "walletBalance"),
                outlet = reader["outlet"]?.ToString() ?? "",
                lastVisit = ReadDate(reader, "lastVisit"),
                notes = reader["notes"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
                membershipId = ReadLong(reader, "membershipId"),
                stampsCurrent = ReadLong(reader, "stampsCurrent"),
                totalVisits = ReadDecimal(reader, "totalVisits"),
                referralCode = reader["referralCode"]?.ToString() ?? "",
                marketingConsent = reader["marketingConsent"]?.ToString() ?? "",
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Customer entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "name", DbTypes.Types.String).Value = entity.name ?? "";
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = entity.phone ?? "";
            db.AddParameter(cmd, "email", DbTypes.Types.String).Value = entity.email ?? "";
            db.AddParameter(cmd, "gender", DbTypes.Types.String).Value = entity.gender ?? "";
            db.AddParameter(cmd, "birthday", DbTypes.Types.Date).Value = entity.birthday ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "anniversary", DbTypes.Types.Date).Value = entity.anniversary ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "household", DbTypes.Types.String).Value = entity.household ?? "";
            db.AddParameter(cmd, "tier", DbTypes.Types.String).Value = entity.tier ?? "";
            db.AddParameter(cmd, "points", DbTypes.Types.Long).Value = entity.points;
            db.AddParameter(cmd, "walletBalance", DbTypes.Types.Decimal).Value = entity.walletBalance;
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = entity.outlet ?? "";
            db.AddParameter(cmd, "lastVisit", DbTypes.Types.Date).Value = entity.lastVisit ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "notes", DbTypes.Types.String).Value = entity.notes ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "membershipId", DbTypes.Types.Long).Value = entity.membershipId;
            db.AddParameter(cmd, "stampsCurrent", DbTypes.Types.Long).Value = entity.stampsCurrent;
            db.AddParameter(cmd, "totalVisits", DbTypes.Types.Decimal).Value = entity.totalVisits;
            db.AddParameter(cmd, "referralCode", DbTypes.Types.String).Value = entity.referralCode ?? "";
            db.AddParameter(cmd, "marketingConsent", DbTypes.Types.String).Value = entity.marketingConsent ?? "";
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
