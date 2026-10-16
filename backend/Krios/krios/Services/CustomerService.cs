using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;
using System.Linq;

namespace Krios.Services.Krios
{
    public class CustomerService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;
        private readonly LoyaltyTransactionService loyaltyTransactionService;
        private readonly MembershipService membershipService;
        private readonly MembershipPlanService membershipPlanService;
        private readonly MembershipUsageService membershipUsageService;
        private readonly VoucherService voucherService;
        private readonly ScratchPlayService scratchPlayService;
        private readonly WheelSpinService wheelSpinService;
        private readonly QrOfferRedemptionService qrOfferRedemptionService;
        private readonly QrOfferService qrOfferService;
        private readonly PartnerCouponService partnerCouponService;
        private readonly LoyaltyService loyaltyService;

        public CustomerService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            LoyaltyTransactionService loyaltyTransactionService,
            MembershipService membershipService,
            MembershipPlanService membershipPlanService,
            MembershipUsageService membershipUsageService,
            VoucherService voucherService,
            ScratchPlayService scratchPlayService,
            WheelSpinService wheelSpinService,
            QrOfferRedemptionService qrOfferRedemptionService,
            QrOfferService qrOfferService,
            PartnerCouponService partnerCouponService,
            LoyaltyService loyaltyService)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.loyaltyTransactionService = loyaltyTransactionService;
            this.membershipService = membershipService;
            this.membershipPlanService = membershipPlanService;
            this.membershipUsageService = membershipUsageService;
            this.voucherService = voucherService;
            this.scratchPlayService = scratchPlayService;
            this.wheelSpinService = wheelSpinService;
            this.qrOfferRedemptionService = qrOfferRedemptionService;
            this.qrOfferService = qrOfferService;
            this.partnerCouponService = partnerCouponService;
            this.loyaltyService = loyaltyService;
        }

        public async Task<List<Customer>> Select(CustomerSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        private static bool isWhatsappColumnReady;

        public async Task<List<Customer>> SelectTransaction(IDb db, CustomerSelectReq req)
        {
            await EnsureIsWhatsappColumn(db);
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", name, phone, ""isWhatsapp"", email, gender, birthday, anniversary, household, tier, points, ""walletBalance"", outlet, ""lastVisit"", notes, createdby, createdon, updatedby, updatedon, ""membershipId"", ""stampsCurrent"", ""totalVisits"", ""referralCode"", ""referredBy"", ""marketingConsent""
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
            var existing = await FindByPhone(db, entity.orgId, entity.phone, entity.locationId);
            if (existing != null) return existing;
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task<List<Customer>> FindAllByPhone(IDb db, long orgId, string? phone)
        {
            var digits = PhoneDigits(phone);
            var list = new List<Customer>();
            if (orgId <= 0 || digits.Length < 10) return list;

            const string query = @"
                SELECT id
                FROM customers
                WHERE ""orgId"" = @orgId
                  AND RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = @phone
                ORDER BY id ASC;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = digits;
            var ids = new List<long>();
            using (var reader = await db.Execute(cmd))
            {
                while (await reader.ReadAsync())
                    ids.Add(Convert.ToInt64(reader["id"]));
            }
            foreach (var id in ids)
            {
                var rows = await SelectTransaction(db, new CustomerSelectReq { id = id, orgId = orgId });
                var row = rows.FirstOrDefault();
                if (row != null) list.Add(row);
            }
            return list;
        }

        private async Task<Customer?> FindByPhone(IDb db, long orgId, string? phone, long locationId = 0)
        {
            var digits = PhoneDigits(phone);
            if (orgId <= 0 || digits.Length < 10) return null;

            const string query = @"
                SELECT id
                FROM customers
                WHERE ""orgId"" = @orgId
                  AND RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = @phone
                  AND (@locationId = 0 OR ""locationId"" = @locationId)
                ORDER BY id ASC
                LIMIT 1;
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            db.AddParameter(cmd, "phone", DbTypes.Types.String).Value = digits;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = locationId;
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

        public async Task<CustomerPosLookupRes> LookupAtPos(CustomerPosLookupReq req)
        {
            var res = new CustomerPosLookupRes();
            var digits = PhoneDigits(req.phone);
            if (req.orgId <= 0 || (req.customerId <= 0 && digits.Length < 10))
            {
                res.errorMessage = "Enter a 10-digit mobile number";
                return res;
            }

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            Customer? customer = null;
            if (req.customerId > 0)
            {
                var byId = await SelectTransaction(db, new CustomerSelectReq { id = req.customerId, orgId = req.orgId });
                customer = byId.FirstOrDefault();
            }
            if (customer == null && digits.Length >= 10)
                customer = await FindByPhone(db, req.orgId, digits, req.locationId);
            if (customer != null && req.locationId > 0 && customer.locationId > 0 && customer.locationId != req.locationId)
                customer = digits.Length >= 10 ? await FindByPhone(db, req.orgId, digits, req.locationId) : null;
            if (customer == null)
            {
                res.errorMessage = "Customer not found";
                return res;
            }

            res.customer = customer;
            var cid = customer.id;
            var orgReq = req.orgId;

            res.memberships = await membershipService.SelectTransaction(db, new MembershipSelectReq { orgId = orgReq, customerId = cid });
            res.membershipPlans = await membershipPlanService.SelectTransaction(db, new MembershipPlanSelectReq { orgId = orgReq });
            res.membershipUsage = await membershipUsageService.SelectTransaction(db, new MembershipUsageSelectReq { orgId = orgReq, customerId = cid });
            res.vouchers = await voucherService.SelectTransaction(db, new VoucherSelectReq { orgId = orgReq, customerId = cid });
            res.scratchPlays = await scratchPlayService.SelectTransaction(db, new ScratchPlaySelectReq { orgId = orgReq, customerId = cid });
            res.wheelSpins = await wheelSpinService.SelectTransaction(db, new WheelSpinSelectReq { orgId = orgReq, customerId = cid });
            res.qrOfferRedemptions = await qrOfferRedemptionService.SelectTransaction(db, new QrOfferRedemptionSelectReq { orgId = orgReq, customerId = cid });
            res.qrOffers = await qrOfferService.SelectTransaction(db, new QrOfferSelectReq { orgId = orgReq });
            res.partnerCoupons = await partnerCouponService.SelectTransaction(db, new PartnerCouponSelectReq { orgId = orgReq, customerId = cid });
            res.loyalty = await loyaltyService.SelectTransaction(db, new LoyaltySelectReq { orgId = orgReq });
            return res;
        }

        public async Task<CustomerValidateWalkInCodeRes> ValidateWalkInCode(CustomerValidateWalkInCodeReq req)
        {
            var res = new CustomerValidateWalkInCodeRes();
            var code = NormalizeCode(req.code);
            if (string.IsNullOrEmpty(code))
            {
                res.ok = true;
                return res;
            }
            if (code.Length < 4)
            {
                res.reason = "Enter the full code";
                return res;
            }
            if (req.orgId <= 0)
            {
                res.reason = "Salon not found";
                return res;
            }

            using IDb db = await dbprovider.GetDb();
            await db.Connect();

            var customers = await SelectTransaction(db, new CustomerSelectReq { orgId = req.orgId });
            var referrer = customers.FirstOrDefault(c =>
                NormalizeCode(c.referralCode) == code || ReferralCodeFor(c.name, c.phone) == code);
            if (referrer != null)
            {
                var guestDigits = PhoneDigits(req.guestPhone);
                if (guestDigits.Length >= 10 && PhoneDigits(referrer.phone) == guestDigits)
                {
                    res.reason = "Use a friend's code, not your own";
                    return res;
                }
                res.ok = true;
                res.kind = "referral";
                res.referrerName = referrer.name ?? "";
                res.label = string.IsNullOrWhiteSpace(referrer.name)
                    ? $"Valid referral code {code}"
                    : $"Valid — {referrer.name}'s referral code";
                return res;
            }

            var vouchers = await voucherService.SelectTransaction(db, new VoucherSelectReq { orgId = req.orgId });
            var voucher = vouchers.FirstOrDefault(v => NormalizeCode(v.code) == code);
            if (voucher != null)
            {
                var status = voucher.status ?? "";
                if (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    res.reason = "Coupon cancelled";
                    return res;
                }
                if (status.Equals("Redeemed", StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(voucher.unlimited, "Yes", StringComparison.OrdinalIgnoreCase))
                {
                    res.reason = "Coupon already used";
                    return res;
                }
                var title = string.IsNullOrWhiteSpace(voucher.schemeTitle) ? code : voucher.schemeTitle;
                res.ok = true;
                res.kind = "coupon";
                res.title = title;
                res.label = $"Valid coupon — {title}. Staff will apply it on the bill.";
                return res;
            }

            var coupon = await FindCouponByCode(db, req.orgId, code);
            if (coupon is { } hit)
            {
                if (string.Equals(hit.status, "Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    res.reason = "Coupon is not active";
                    return res;
                }
                var title = string.IsNullOrWhiteSpace(hit.title) ? hit.code : hit.title;
                res.ok = true;
                res.kind = "coupon";
                res.title = title;
                res.label = $"Valid offer — {title}. Staff will apply it on the bill.";
                return res;
            }

            var partners = await partnerCouponService.SelectTransaction(db, new PartnerCouponSelectReq { orgId = req.orgId });
            var partner = partners.FirstOrDefault(p => NormalizeCode(p.couponCode) == code);
            if (partner != null)
            {
                if (string.Equals(partner.status, "Redeemed", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(partner.status, "Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    res.reason = "Coupon already used or cancelled";
                    return res;
                }
                var title = string.IsNullOrWhiteSpace(partner.offer) ? code : partner.offer;
                res.ok = true;
                res.kind = "coupon";
                res.title = title;
                res.label = $"Valid coupon — {title}. Staff will apply it on the bill.";
                return res;
            }

            res.reason = "Code not found for this salon";
            return res;
        }

        public static string ReferralCodeFor(string? name, string? phone)
        {
            var letters = new string((name ?? "").Where(char.IsLetter).ToArray()).ToUpperInvariant();
            var stem = string.IsNullOrEmpty(letters) ? "KRIOS" : (letters.Length <= 4 ? letters : letters[..4]);
            var digits = PhoneDigits(phone);
            var tail = digits.Length <= 4 ? digits : digits[^4..];
            return stem + tail;
        }

        private static string NormalizeCode(string? value) =>
            (value ?? "").Trim().TrimStart('#').ToUpperInvariant();

        private async Task<(string code, string title, string status)?> FindCouponByCode(IDb db, long orgId, string code)
        {
            const string query = @"
                SELECT code, title, status
                FROM coupons
                WHERE ""orgId"" = @orgId
            ";
            var cmd = db.GetCommand(query);
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = orgId;
            using DbDataReader reader = await db.Execute(cmd);
            while (await reader.ReadAsync())
            {
                var rowCode = NormalizeCode(reader["code"]?.ToString());
                if (rowCode != code) continue;
                return (
                    reader["code"]?.ToString() ?? "",
                    reader["title"]?.ToString() ?? "",
                    reader["status"]?.ToString() ?? ""
                );
            }
            return null;
        }

        public async Task InsertTransaction(IDb db, Customer entity)
        {
            await EnsureIsWhatsappColumn(db);
            const string query = @"
                INSERT INTO customers (
                    ""orgId"", ""locationId"", name, phone, ""isWhatsapp"", email, gender, birthday, anniversary, household, tier, points, ""walletBalance"", outlet, ""lastVisit"", notes, createdby, createdon, updatedby, updatedon, ""membershipId"", ""stampsCurrent"", ""totalVisits"", ""referralCode"", ""referredBy"", ""marketingConsent""
                )
                VALUES (
                    @orgId, @locationId, @name, @phone, @isWhatsapp, @email, @gender, @birthday, @anniversary, @household, @tier, @points, @walletBalance, @outlet, @lastVisit, @notes, @createdby, @createdon, @updatedby, @updatedon, @membershipId, @stampsCurrent, @totalVisits, @referralCode, @referredBy, @marketingConsent
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
            await EnsureIsWhatsappColumn(db);
            const string query = @"
                UPDATE customers SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    name = @name,
                    phone = @phone,
                    ""isWhatsapp"" = @isWhatsapp,
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
                    ""referredBy"" = @referredBy,
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
                isWhatsapp = ReadString(reader, "isWhatsapp"),
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
                referredBy = reader["referredBy"]?.ToString() ?? "",
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
            db.AddParameter(cmd, "isWhatsapp", DbTypes.Types.String).Value = NormalizeYesNo(entity.isWhatsapp);
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
            db.AddParameter(cmd, "referredBy", DbTypes.Types.String).Value = entity.referredBy ?? "";
            db.AddParameter(cmd, "marketingConsent", DbTypes.Types.String).Value = entity.marketingConsent ?? "";
        }

        private static async Task EnsureIsWhatsappColumn(IDb db)
        {
            if (isWhatsappColumnReady) return;
            var cmd = db.GetCommand(@"ALTER TABLE customers ADD COLUMN IF NOT EXISTS ""isWhatsapp"" VARCHAR(16);");
            await db.ExecuteNonQuery(cmd);
            isWhatsappColumnReady = true;
        }

        private static string NormalizeYesNo(string? value)
        {
            var v = (value ?? "").Trim();
            if (v.Equals("Yes", StringComparison.OrdinalIgnoreCase)
                || v.Equals("true", StringComparison.OrdinalIgnoreCase)
                || v == "1")
                return "Yes";
            return "No";
        }

        private static string ReadString(DbDataReader reader, string column)
        {
            try
            {
                var value = reader[column];
                return value == DBNull.Value ? "" : value?.ToString() ?? "";
            }
            catch
            {
                return "";
            }
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
