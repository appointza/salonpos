using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class CouponService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;
        private readonly CustomerService customerService;

        public CouponService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            CustomerService customerService)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.customerService = customerService;
        }

        public async Task<List<Coupon>> Select(CouponSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Coupon>> SelectTransaction(IDb db, CouponSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", code, ""codePrefix"", ""codeSuffix"", ""codeStartNumber"", ""codeLength"", ""couponQuantity"", ""autoGenerateCodes"", ""eligibleLocationIds"", ""allowWithOtherDiscounts"", ""allowWithLoyalty"", title, description, ""discountType"", ""discountValue"", ""maxDiscount"", ""flatPrice"", ""buyQty"", ""freeQty"", ""freeItemName"", ""appliesTo"", ""targetIds"", ""targetNames"", ""minBillAmount"", ""minQuantity"", ""minBookingValue"", ""customerSegment"", ""targetCustomerId"", ""discountSlabs"", ""inactiveDays"", ""staffId"", ""paymentMethod"", ""firstAppointmentOnly"", ""advanceBookingDays"", ""validityStart"", ""validityEnd"", ""validDays"", ""validTimeStart"", ""validTimeEnd"", ""flashEndsAt"", ""usageLimitMode"", ""totalUsageLimit"", ""perCustomerLimit"", ""usageCount"", status, ""campaignTag"", createdby, createdon, updatedby, updatedon
                FROM coupons
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

            var result = new List<Coupon>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Coupon> Insert(Coupon entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Coupon entity)
        {
            const string query = @"
                INSERT INTO coupons (
                    ""orgId"", ""locationId"", code, ""codePrefix"", ""codeSuffix"", ""codeStartNumber"", ""codeLength"", ""couponQuantity"", ""autoGenerateCodes"", ""eligibleLocationIds"", ""allowWithOtherDiscounts"", ""allowWithLoyalty"", title, description, ""discountType"", ""discountValue"", ""maxDiscount"", ""flatPrice"", ""buyQty"", ""freeQty"", ""freeItemName"", ""appliesTo"", ""targetIds"", ""targetNames"", ""minBillAmount"", ""minQuantity"", ""minBookingValue"", ""customerSegment"", ""targetCustomerId"", ""discountSlabs"", ""inactiveDays"", ""staffId"", ""paymentMethod"", ""firstAppointmentOnly"", ""advanceBookingDays"", ""validityStart"", ""validityEnd"", ""validDays"", ""validTimeStart"", ""validTimeEnd"", ""flashEndsAt"", ""usageLimitMode"", ""totalUsageLimit"", ""perCustomerLimit"", ""usageCount"", status, ""campaignTag"", createdby, createdon, updatedby, updatedon
                )
                VALUES (
                    @orgId, @locationId, @code, @codePrefix, @codeSuffix, @codeStartNumber, @codeLength, @couponQuantity, @autoGenerateCodes, @eligibleLocationIds, @allowWithOtherDiscounts, @allowWithLoyalty, @title, @description, @discountType, @discountValue, @maxDiscount, @flatPrice, @buyQty, @freeQty, @freeItemName, @appliesTo, @targetIds, @targetNames, @minBillAmount, @minQuantity, @minBookingValue, @customerSegment, @targetCustomerId, @discountSlabs, @inactiveDays, @staffId, @paymentMethod, @firstAppointmentOnly, @advanceBookingDays, @validityStart, @validityEnd, @validDays, @validTimeStart, @validTimeEnd, @flashEndsAt, @usageLimitMode, @totalUsageLimit, @perCustomerLimit, @usageCount, @status, @campaignTag, @createdby, @createdon, @updatedby, @updatedon
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

        public async Task<Coupon> Update(Coupon entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Coupon entity)
        {
            const string query = @"
                UPDATE coupons SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    code = @code,
                    ""codePrefix"" = @codePrefix,
                    ""codeSuffix"" = @codeSuffix,
                    ""codeStartNumber"" = @codeStartNumber,
                    ""codeLength"" = @codeLength,
                    ""couponQuantity"" = @couponQuantity,
                    ""autoGenerateCodes"" = @autoGenerateCodes,
                    ""eligibleLocationIds"" = @eligibleLocationIds,
                    ""allowWithOtherDiscounts"" = @allowWithOtherDiscounts,
                    ""allowWithLoyalty"" = @allowWithLoyalty,
                    title = @title,
                    description = @description,
                    ""discountType"" = @discountType,
                    ""discountValue"" = @discountValue,
                    ""maxDiscount"" = @maxDiscount,
                    ""flatPrice"" = @flatPrice,
                    ""buyQty"" = @buyQty,
                    ""freeQty"" = @freeQty,
                    ""freeItemName"" = @freeItemName,
                    ""appliesTo"" = @appliesTo,
                    ""targetIds"" = @targetIds,
                    ""targetNames"" = @targetNames,
                    ""minBillAmount"" = @minBillAmount,
                    ""minQuantity"" = @minQuantity,
                    ""minBookingValue"" = @minBookingValue,
                    ""customerSegment"" = @customerSegment,
                    ""targetCustomerId"" = @targetCustomerId,
                    ""discountSlabs"" = @discountSlabs,
                    ""inactiveDays"" = @inactiveDays,
                    ""staffId"" = @staffId,
                    ""paymentMethod"" = @paymentMethod,
                    ""firstAppointmentOnly"" = @firstAppointmentOnly,
                    ""advanceBookingDays"" = @advanceBookingDays,
                    ""validityStart"" = @validityStart,
                    ""validityEnd"" = @validityEnd,
                    ""validDays"" = @validDays,
                    ""validTimeStart"" = @validTimeStart,
                    ""validTimeEnd"" = @validTimeEnd,
                    ""flashEndsAt"" = @flashEndsAt,
                    ""usageLimitMode"" = @usageLimitMode,
                    ""totalUsageLimit"" = @totalUsageLimit,
                    ""perCustomerLimit"" = @perCustomerLimit,
                    ""usageCount"" = @usageCount,
                    status = @status,
                    ""campaignTag"" = @campaignTag,
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

        public async Task<bool> Delete(CouponDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, CouponDeleteReq req)
        {
            const string query = @"
                UPDATE coupons
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

        public async Task<CouponValidateAtPosRes> ValidateAtPos(CouponValidateAtPosReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await ValidateAtPosTransaction(db, req);
        }

        public async Task<CouponValidateAtPosRes> ValidateAtPosTransaction(IDb db, CouponValidateAtPosReq req)
        {
            var res = new CouponValidateAtPosRes();
            var code = (req.code ?? "").Trim();
            if (string.IsNullOrWhiteSpace(code))
            {
                res.reason = "Enter a coupon code";
                return res;
            }

            var coupons = await SelectTransaction(db, new CouponSelectReq { orgId = req.orgId, search = code });
            var coupon = coupons.FirstOrDefault(c => string.Equals(c.code, code, StringComparison.OrdinalIgnoreCase));
            if (coupon == null)
            {
                res.reason = "Invalid coupon code";
                return res;
            }

            if (req.alreadyAppliedCouponIds.Contains(coupon.id))
            {
                res.reason = "Coupon already applied on this bill";
                return res;
            }

            var customers = await customerService.SelectTransaction(db, new CustomerSelectReq { id = req.customerId, orgId = req.orgId });
            var customer = customers.FirstOrDefault();
            if (customer == null)
            {
                res.reason = "Customer not found";
                return res;
            }

            var eligibility = EvaluateEligibility(coupon, req, customer);
            if (!eligibility.ok)
            {
                res.reason = eligibility.reason;
                return res;
            }

            var eligibleSubtotal = EligibleSubtotal(coupon, req.lines);
            res.eligibleSubtotal = eligibleSubtotal;
            if (eligibleSubtotal <= 0)
            {
                res.reason = "No eligible items for this coupon";
                return res;
            }

            var amount = CalculateDiscount(coupon, eligibleSubtotal);
            if (amount <= 0)
            {
                res.reason = "No discount applicable on this bill";
                return res;
            }

            res.ok = true;
            res.couponId = coupon.id;
            res.code = coupon.code;
            res.title = coupon.title;
            res.amount = Math.Min(amount, eligibleSubtotal);
            return res;
        }

        public async Task<CouponClaimAtPosRes> ClaimAtPos(CouponClaimAtPosReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await db.BeginTransaction();
            try
            {
                var rows = await SelectTransaction(db, new CouponSelectReq { id = req.couponId, orgId = req.orgId });
                var coupon = rows.FirstOrDefault();
                if (coupon == null)
                {
                    await db.RollbackTransaction();
                    return new CouponClaimAtPosRes { errorMessage = "Coupon not found" };
                }
                coupon.usageCount += 1;
                await UpdateTransaction(db, coupon);
                await db.CommitTransaction();
                return new CouponClaimAtPosRes { success = true };
            }
            catch (Exception ex)
            {
                await db.RollbackTransaction();
                return new CouponClaimAtPosRes { errorMessage = ex.Message };
            }
        }

        private static (bool ok, string reason) EvaluateEligibility(Coupon coupon, CouponValidateAtPosReq req, Customer customer)
        {
            if (!string.Equals(coupon.status, "Active", StringComparison.OrdinalIgnoreCase))
                return (false, "Coupon is not active");

            if (coupon.locationId > 0 && coupon.locationId != req.locationId)
            {
                if (!LocationAllowed(coupon.eligibleLocationIds, req.locationId))
                    return (false, "Not valid at this outlet");
            }

            var today = DateTime.UtcNow.Date;
            if (coupon.validityStart.HasValue && today < coupon.validityStart.Value.Date)
                return (false, "Coupon not started yet");
            if (coupon.validityEnd.HasValue && today > coupon.validityEnd.Value.Date)
                return (false, "Coupon expired");

            if (coupon.minBillAmount > 0)
            {
                var bill = req.lines.Sum(l => l.price * l.qty);
                if (bill < coupon.minBillAmount)
                    return (false, $"Minimum bill ₹{coupon.minBillAmount:N0} required");
            }

            if (coupon.targetCustomerId > 0 && coupon.targetCustomerId != req.customerId)
                return (false, "Coupon not issued to this customer");

            if (!string.IsNullOrWhiteSpace(coupon.paymentMethod) &&
                !string.Equals(coupon.paymentMethod, "Any", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(coupon.paymentMethod, req.paymentMethod, StringComparison.OrdinalIgnoreCase))
                return (false, $"Valid for {coupon.paymentMethod} only");

            var segment = (coupon.customerSegment ?? "all").ToLowerInvariant();
            if (segment == "gold" && !string.Equals(customer.tier, "Gold", StringComparison.OrdinalIgnoreCase))
                return (false, "Gold members only");
            if (segment == "platinum" && !string.Equals(customer.tier, "Platinum", StringComparison.OrdinalIgnoreCase))
                return (false, "Platinum members only");

            if (string.Equals(coupon.usageLimitMode, "limited_total", StringComparison.OrdinalIgnoreCase) &&
                coupon.totalUsageLimit > 0 && coupon.usageCount >= (long)coupon.totalUsageLimit)
                return (false, "Coupon usage limit reached");

            return (true, "");
        }

        private static bool LocationAllowed(string eligibleLocationIds, long locationId)
        {
            if (string.IsNullOrWhiteSpace(eligibleLocationIds)) return true;
            var ids = eligibleLocationIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            return ids.Any(id => long.TryParse(id, out var n) && n == locationId);
        }

        private static decimal EligibleSubtotal(Coupon coupon, List<CouponCartLine> lines)
        {
            var appliesTo = (coupon.appliesTo ?? "entire_bill").ToLowerInvariant();
            var targets = (coupon.targetIds ?? "").ToLowerInvariant().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToHashSet();

            decimal sum = 0;
            foreach (var line in lines)
            {
                var kind = (line.kind ?? "").ToLowerInvariant();
                var lineTotal = line.price * line.qty;
                if (appliesTo == "entire_bill") { sum += lineTotal; continue; }
                if (appliesTo == "services" && kind == "service") { sum += lineTotal; continue; }
                if (appliesTo == "products" && kind == "product") { sum += lineTotal; continue; }
                if (appliesTo == "categories" && kind == "service")
                {
                    if (targets.Count == 0 || targets.Contains((line.category ?? "").ToLowerInvariant()))
                        sum += lineTotal;
                }
            }
            return sum;
        }

        private static decimal CalculateDiscount(Coupon coupon, decimal eligibleSubtotal)
        {
            var type = (coupon.discountType ?? "").ToLowerInvariant();
            decimal amount = 0;
            if (type == "percentage" || type == "% off")
                amount = Math.Round(eligibleSubtotal * (coupon.discountValue / 100m), 0);
            else if (type == "flat" || type == "fixed_amount" || type == "flat off")
                amount = coupon.discountValue;
            else if (type == "flat_price" && coupon.flatPrice > 0)
                amount = Math.Max(0, eligibleSubtotal - coupon.flatPrice);

            if (coupon.maxDiscount > 0) amount = Math.Min(amount, coupon.maxDiscount);
            return Math.Max(0, amount);
        }

        private static Coupon Map(DbDataReader reader)
        {
            return new Coupon
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                code = reader["code"]?.ToString() ?? "",
                codePrefix = reader["codePrefix"]?.ToString() ?? "",
                codeSuffix = reader["codeSuffix"]?.ToString() ?? "",
                codeStartNumber = ReadLong(reader, "codeStartNumber"),
                codeLength = ReadLong(reader, "codeLength"),
                couponQuantity = ReadDecimal(reader, "couponQuantity"),
                autoGenerateCodes = reader["autoGenerateCodes"]?.ToString() ?? "",
                eligibleLocationIds = reader["eligibleLocationIds"]?.ToString() ?? "",
                allowWithOtherDiscounts = reader["allowWithOtherDiscounts"]?.ToString() ?? "",
                allowWithLoyalty = reader["allowWithLoyalty"]?.ToString() ?? "",
                title = reader["title"]?.ToString() ?? "",
                description = reader["description"]?.ToString() ?? "",
                discountType = reader["discountType"]?.ToString() ?? "",
                discountValue = ReadDecimal(reader, "discountValue"),
                maxDiscount = ReadDecimal(reader, "maxDiscount"),
                flatPrice = ReadDecimal(reader, "flatPrice"),
                buyQty = ReadDecimal(reader, "buyQty"),
                freeQty = ReadDecimal(reader, "freeQty"),
                freeItemName = reader["freeItemName"]?.ToString() ?? "",
                appliesTo = reader["appliesTo"]?.ToString() ?? "",
                targetIds = reader["targetIds"]?.ToString() ?? "",
                targetNames = reader["targetNames"]?.ToString() ?? "",
                minBillAmount = ReadDecimal(reader, "minBillAmount"),
                minQuantity = ReadDecimal(reader, "minQuantity"),
                minBookingValue = ReadDecimal(reader, "minBookingValue"),
                customerSegment = reader["customerSegment"]?.ToString() ?? "",
                targetCustomerId = ReadLong(reader, "targetCustomerId"),
                discountSlabs = reader["discountSlabs"]?.ToString() ?? "",
                inactiveDays = ReadLong(reader, "inactiveDays"),
                staffId = ReadLong(reader, "staffId"),
                paymentMethod = reader["paymentMethod"]?.ToString() ?? "",
                firstAppointmentOnly = reader["firstAppointmentOnly"]?.ToString() ?? "",
                advanceBookingDays = ReadLong(reader, "advanceBookingDays"),
                validityStart = ReadDate(reader, "validityStart"),
                validityEnd = ReadDate(reader, "validityEnd"),
                validDays = reader["validDays"]?.ToString() ?? "",
                validTimeStart = reader["validTimeStart"]?.ToString() ?? "",
                validTimeEnd = reader["validTimeEnd"]?.ToString() ?? "",
                flashEndsAt = reader["flashEndsAt"]?.ToString() ?? "",
                usageLimitMode = reader["usageLimitMode"]?.ToString() ?? "",
                totalUsageLimit = ReadDecimal(reader, "totalUsageLimit"),
                perCustomerLimit = ReadLong(reader, "perCustomerLimit"),
                usageCount = ReadLong(reader, "usageCount"),
                status = reader["status"]?.ToString() ?? "",
                campaignTag = reader["campaignTag"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Coupon entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "code", DbTypes.Types.String).Value = entity.code ?? "";
            db.AddParameter(cmd, "codePrefix", DbTypes.Types.String).Value = entity.codePrefix ?? "";
            db.AddParameter(cmd, "codeSuffix", DbTypes.Types.String).Value = entity.codeSuffix ?? "";
            db.AddParameter(cmd, "codeStartNumber", DbTypes.Types.Integer).Value = AsInt(entity.codeStartNumber);
            db.AddParameter(cmd, "codeLength", DbTypes.Types.Integer).Value = AsInt(entity.codeLength);
            db.AddParameter(cmd, "couponQuantity", DbTypes.Types.Integer).Value = AsInt(entity.couponQuantity);
            db.AddParameter(cmd, "autoGenerateCodes", DbTypes.Types.String).Value = entity.autoGenerateCodes ?? "";
            db.AddParameter(cmd, "eligibleLocationIds", DbTypes.Types.String).Value = entity.eligibleLocationIds ?? "";
            db.AddParameter(cmd, "allowWithOtherDiscounts", DbTypes.Types.String).Value = entity.allowWithOtherDiscounts ?? "";
            db.AddParameter(cmd, "allowWithLoyalty", DbTypes.Types.String).Value = entity.allowWithLoyalty ?? "";
            db.AddParameter(cmd, "title", DbTypes.Types.String).Value = entity.title ?? "";
            db.AddParameter(cmd, "description", DbTypes.Types.String).Value = entity.description ?? "";
            db.AddParameter(cmd, "discountType", DbTypes.Types.String).Value = entity.discountType ?? "";
            db.AddParameter(cmd, "discountValue", DbTypes.Types.Decimal).Value = entity.discountValue;
            db.AddParameter(cmd, "maxDiscount", DbTypes.Types.Decimal).Value = entity.maxDiscount;
            db.AddParameter(cmd, "flatPrice", DbTypes.Types.Decimal).Value = entity.flatPrice;
            db.AddParameter(cmd, "buyQty", DbTypes.Types.Integer).Value = AsInt(entity.buyQty);
            db.AddParameter(cmd, "freeQty", DbTypes.Types.Integer).Value = AsInt(entity.freeQty);
            db.AddParameter(cmd, "freeItemName", DbTypes.Types.String).Value = entity.freeItemName ?? "";
            db.AddParameter(cmd, "appliesTo", DbTypes.Types.String).Value = entity.appliesTo ?? "";
            db.AddParameter(cmd, "targetIds", DbTypes.Types.String).Value = entity.targetIds ?? "";
            db.AddParameter(cmd, "targetNames", DbTypes.Types.String).Value = entity.targetNames ?? "";
            db.AddParameter(cmd, "minBillAmount", DbTypes.Types.Decimal).Value = entity.minBillAmount;
            db.AddParameter(cmd, "minQuantity", DbTypes.Types.Integer).Value = AsInt(entity.minQuantity);
            db.AddParameter(cmd, "minBookingValue", DbTypes.Types.Integer).Value = AsInt(entity.minBookingValue);
            db.AddParameter(cmd, "customerSegment", DbTypes.Types.String).Value = entity.customerSegment ?? "";
            db.AddParameter(cmd, "targetCustomerId", DbTypes.Types.Long).Value = entity.targetCustomerId;
            db.AddParameter(cmd, "discountSlabs", DbTypes.Types.String).Value = entity.discountSlabs ?? "";
            db.AddParameter(cmd, "inactiveDays", DbTypes.Types.Integer).Value = AsInt(entity.inactiveDays);
            db.AddParameter(cmd, "staffId", DbTypes.Types.Long).Value = entity.staffId;
            db.AddParameter(cmd, "paymentMethod", DbTypes.Types.String).Value = entity.paymentMethod ?? "";
            db.AddParameter(cmd, "firstAppointmentOnly", DbTypes.Types.String).Value = entity.firstAppointmentOnly ?? "";
            db.AddParameter(cmd, "advanceBookingDays", DbTypes.Types.Integer).Value = AsInt(entity.advanceBookingDays);
            db.AddParameter(cmd, "validityStart", DbTypes.Types.Date).Value = entity.validityStart ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "validityEnd", DbTypes.Types.Date).Value = entity.validityEnd ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "validDays", DbTypes.Types.String).Value = entity.validDays ?? "";
            db.AddParameter(cmd, "validTimeStart", DbTypes.Types.Time).Value = AsTime(entity.validTimeStart);
            db.AddParameter(cmd, "validTimeEnd", DbTypes.Types.Time).Value = AsTime(entity.validTimeEnd);
            db.AddParameter(cmd, "flashEndsAt", DbTypes.Types.String).Value = entity.flashEndsAt ?? "";
            db.AddParameter(cmd, "usageLimitMode", DbTypes.Types.String).Value = entity.usageLimitMode ?? "";
            db.AddParameter(cmd, "totalUsageLimit", DbTypes.Types.Decimal).Value = entity.totalUsageLimit;
            db.AddParameter(cmd, "perCustomerLimit", DbTypes.Types.Integer).Value = AsInt(entity.perCustomerLimit);
            db.AddParameter(cmd, "usageCount", DbTypes.Types.Integer).Value = AsInt(entity.usageCount);
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "campaignTag", DbTypes.Types.String).Value = entity.campaignTag ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
        }

        private static int AsInt(long value)
        {
            if (value > int.MaxValue) return int.MaxValue;
            if (value < int.MinValue) return int.MinValue;
            return (int)value;
        }

        private static int AsInt(decimal value)
        {
            var whole = decimal.Truncate(value);
            if (whole > int.MaxValue) return int.MaxValue;
            if (whole < int.MinValue) return int.MinValue;
            return (int)whole;
        }

        /// <summary>coupons.validTimeStart/End are TIME. An empty string is not a valid time and fails the insert.</summary>
        private static object AsTime(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return DBNull.Value;
            return TimeSpan.TryParse(value, out var parsed) ? parsed : DBNull.Value;
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
