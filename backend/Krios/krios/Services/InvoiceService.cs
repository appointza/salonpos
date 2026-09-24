using Krios.Models.Krios;
using Krios.Utils;
using System.Data.Common;

namespace Krios.Services.Krios
{
    public class InvoiceService
    {
        private readonly IDbProvider dbprovider;
        private readonly IQueryBuilderProvider querybuilderprovider;
        private readonly RequestState requeststate;
        private readonly CustomerService customerService;
        private readonly OrganizationService organizationService;
        private readonly LoyaltyService loyaltyService;
        private readonly LoyaltyTransactionService loyaltyTransactionService;
        private readonly MembershipService membershipService;
        private readonly MembershipPlanService membershipPlanService;
        private readonly ServiceService serviceService;
        private readonly StaffService staffService;
        private readonly CommissionService commissionService;
        private readonly AppointmentService appointmentService;
        private readonly WheelSpinService wheelSpinService;
        private readonly CouponService couponService;
        private readonly InventoryService inventoryService;
        private readonly InventoryStockService inventoryStockService;

        public InvoiceService(
            IDbProvider dbprovider,
            IQueryBuilderProvider querybuilderprovider,
            RequestState requeststate,
            CustomerService customerService,
            OrganizationService organizationService,
            LoyaltyService loyaltyService,
            LoyaltyTransactionService loyaltyTransactionService,
            MembershipService membershipService,
            MembershipPlanService membershipPlanService,
            ServiceService serviceService,
            StaffService staffService,
            CommissionService commissionService,
            AppointmentService appointmentService,
            WheelSpinService wheelSpinService,
            CouponService couponService,
            InventoryService inventoryService,
            InventoryStockService inventoryStockService)
        {
            this.dbprovider = dbprovider;
            this.querybuilderprovider = querybuilderprovider;
            this.requeststate = requeststate;
            this.customerService = customerService;
            this.organizationService = organizationService;
            this.loyaltyService = loyaltyService;
            this.loyaltyTransactionService = loyaltyTransactionService;
            this.membershipService = membershipService;
            this.membershipPlanService = membershipPlanService;
            this.serviceService = serviceService;
            this.staffService = staffService;
            this.commissionService = commissionService;
            this.appointmentService = appointmentService;
            this.wheelSpinService = wheelSpinService;
            this.couponService = couponService;
            this.inventoryService = inventoryService;
            this.inventoryStockService = inventoryStockService;
        }

        public async Task<List<Invoice>> Select(InvoiceSelectReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await SelectTransaction(db, req);
        }

        public async Task<List<Invoice>> SelectTransaction(IDb db, InvoiceSelectReq req)
        {
            const string query = @"
                SELECT id, ""orgId"", ""locationId"", customer, outlet, date, items, subtotal, discount, ""gstRate"", tax, total, payment, status, createdby, createdon, updatedby, updatedon, ""customerId"", ""membershipId""
                FROM invoices
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

            var result = new List<Invoice>();
            using DbDataReader reader = await db.Execute(command);
            while (await reader.ReadAsync())
                result.Add(Map(reader));

            return result;
        }

        public async Task<Invoice> Insert(Invoice entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await InsertTransaction(db, entity);
            return entity;
        }

        public async Task InsertTransaction(IDb db, Invoice entity)
        {
            const string query = @"
                INSERT INTO invoices (
                    ""orgId"", ""locationId"", customer, outlet, date, items, subtotal, discount, ""gstRate"", tax, total, payment, status, createdby, createdon, updatedby, updatedon, ""customerId"", ""membershipId""
                )
                VALUES (
                    @orgId, @locationId, @customer, @outlet, @date, @items, @subtotal, @discount, @gstRate, @tax, @total, @payment, @status, @createdby, @createdon, @updatedby, @updatedon, @customerId, @membershipId
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

        public async Task<Invoice> Update(Invoice entity)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await UpdateTransaction(db, entity);
            return entity;
        }

        public async Task<bool> UpdateTransaction(IDb db, Invoice entity)
        {
            const string query = @"
                UPDATE invoices SET
                    ""orgId"" = @orgId,
                    ""locationId"" = @locationId,
                    customer = @customer,
                    outlet = @outlet,
                    date = @date,
                    items = @items,
                    subtotal = @subtotal,
                    discount = @discount,
                    ""gstRate"" = @gstRate,
                    tax = @tax,
                    total = @total,
                    payment = @payment,
                    status = @status,
                    createdby = @createdby,
                    createdon = @createdon,
                    updatedby = @updatedby,
                    updatedon = @updatedon,
                    ""customerId"" = @customerId,
                    ""membershipId"" = @membershipId
                WHERE id = @id
            ";

            
            entity.updatedon = DateTime.UtcNow.Date;
            entity.updatedby = requeststate.usercontext.id > 0 ? requeststate.usercontext.id.ToString() : entity.updatedby;
            var cmd = db.GetCommand(query);
            Bind(cmd, db, entity, includeId: true);
            return await db.ExecuteNonQuery(cmd) > 0;
        }

        public async Task<bool> Delete(InvoiceDeleteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await DeleteTransaction(db, req);
        }

        public async Task<bool> DeleteTransaction(IDb db, InvoiceDeleteReq req)
        {
            const string query = @"
                UPDATE invoices
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

        public async Task<InvoiceQuoteRes> Quote(InvoiceQuoteReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await QuoteTransaction(db, req);
        }

        public async Task<InvoiceCompleteSaleRes> CompleteSale(InvoiceCompleteSaleReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await db.BeginTransaction();
            try
            {
                var quote = await QuoteTransaction(db, req);
                if (!string.IsNullOrWhiteSpace(quote.errorMessage))
                {
                    await db.RollbackTransaction();
                    return new InvoiceCompleteSaleRes { quote = quote, errorMessage = quote.errorMessage };
                }

                var today = DateTime.UtcNow.Date;
                var customerRows = await customerService.SelectTransaction(db, new CustomerSelectReq { id = req.customerId, orgId = req.orgId });
                var customer = customerRows.FirstOrDefault();
                if (customer == null)
                {
                    await db.RollbackTransaction();
                    return new InvoiceCompleteSaleRes { errorMessage = "Customer not found" };
                }

                var effLocation = req.locationId > 0 ? req.locationId : customer.locationId;

                var availabilityLines = req.lines.Select(l => new InventoryAvailabilityLine
                {
                    id = l.id,
                    kind = l.kind,
                    name = l.name,
                    qty = l.qty,
                }).ToList();
                var stockCheck = await inventoryStockService.ValidateForSaleTransaction(db, req.orgId, effLocation, availabilityLines);
                if (!stockCheck.ok)
                {
                    await db.RollbackTransaction();
                    return new InvoiceCompleteSaleRes { quote = quote, errorMessage = stockCheck.errorMessage };
                }

                var invoice = new Invoice
                {
                    orgId = req.orgId,
                    locationId = effLocation,
                    customerId = req.customerId,
                    customer = customer.name,
                    outlet = req.outletName,
                    date = today,
                    items = string.Join(", ", req.lines.Select(l => $"{l.name} x{l.qty}")),
                    subtotal = quote.subtotal,
                    discount = quote.otherDiscount,
                    gstRate = req.lines.FirstOrDefault()?.gstRate ?? 18,
                    tax = quote.tax,
                    total = quote.total,
                    payment = req.payment,
                    status = "Paid",
                    membershipId = customer.membershipId,
                };
                await InsertTransaction(db, invoice);

                foreach (var line in req.lines.Where(l => l.staffId > 0 || !string.IsNullOrWhiteSpace(l.staff)))
                {
                    var staffRows = await staffService.SelectTransaction(db, new StaffSelectReq { orgId = req.orgId });
                    var person = staffRows.FirstOrDefault(s => s.id == line.staffId) ??
                                 staffRows.FirstOrDefault(s => string.Equals(s.name, line.staff, StringComparison.OrdinalIgnoreCase));
                    var rate = person?.commissionRate ?? line.commission;
                    var baseAmount = line.price * line.qty;
                    await commissionService.InsertTransaction(db, new Commission
                    {
                        orgId = req.orgId,
                        locationId = effLocation,
                        staffId = person?.id ?? line.staffId,
                        invoiceId = invoice.id,
                        serviceId = line.kind == "service" ? line.id : 0,
                        item = line.name,
                        type = line.kind == "service" ? "Service" : "Product",
                        baseAmount = baseAmount,
                        rate = rate,
                        amount = Math.Round(baseAmount * rate / 100m, 0),
                        date = today,
                        status = "Open",
                    });
                }

                long runningPoints = customer.points;
                if (quote.pointsRedeemApplied > 0)
                {
                    var redeemed = await loyaltyTransactionService.PostPointsTransaction(db, new LoyaltyPostPointsReq
                    {
                        orgId = req.orgId,
                        locationId = effLocation,
                        customerId = req.customerId,
                        type = "Redeem",
                        points = quote.pointsRedeemApplied,
                        source = "invoice",
                        referenceId = invoice.id,
                        invoiceId = invoice.id,
                        programId = quote.programId,
                        reason = "POS redemption",
                    });
                    if (redeemed.ok) runningPoints = redeemed.balanceAfter;
                }
                if (quote.pointsToEarn > 0)
                {
                    DateTime? expiresOn = quote.expiryMonths > 0 ? today.AddMonths((int)quote.expiryMonths) : null;
                    var earned = await loyaltyTransactionService.PostPointsTransaction(db, new LoyaltyPostPointsReq
                    {
                        orgId = req.orgId,
                        locationId = effLocation,
                        customerId = req.customerId,
                        type = "Earn",
                        points = quote.pointsToEarn,
                        source = "invoice",
                        referenceId = invoice.id,
                        invoiceId = invoice.id,
                        programId = quote.programId,
                        expiresOn = expiresOn,
                        reason = "POS purchase",
                    });
                    if (earned.ok) runningPoints = earned.balanceAfter;
                }

                customer.lastVisit = today;
                customer.totalVisits += 1;
                customer.points = runningPoints;
                await customerService.UpdateTransaction(db, customer);

                if (req.rewards?.wheelSpinId > 0)
                    await wheelSpinService.RedeemAtPosTransaction(db, req.rewards.wheelSpinId, invoice.id);

                if (req.appointmentId > 0)
                    await appointmentService.CompleteForInvoiceTransaction(db, req.appointmentId, invoice.id);

                await inventoryStockService.IssueForSaleTransaction(db, new InventoryIssueForSaleReq
                {
                    orgId = req.orgId,
                    locationId = effLocation,
                    customerId = req.customerId,
                    invoiceId = invoice.id,
                    date = today,
                    lines = availabilityLines,
                });

                await db.CommitTransaction();
                return new InvoiceCompleteSaleRes
                {
                    invoice = invoice,
                    quote = quote,
                    pointsEarned = quote.pointsToEarn,
                    pointsAfter = runningPoints,
                };
            }
            catch (Exception ex)
            {
                await db.RollbackTransaction();
                return new InvoiceCompleteSaleRes { errorMessage = ex.Message };
            }
        }

        public async Task<InvoiceRefundRes> Refund(InvoiceRefundReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await db.BeginTransaction();
            try
            {
                var rows = await SelectTransaction(db, new InvoiceSelectReq { id = req.id, orgId = req.orgId });
                var invoice = rows.FirstOrDefault();
                if (invoice == null)
                {
                    await db.RollbackTransaction();
                    return new InvoiceRefundRes { errorMessage = "Invoice not found" };
                }
                if (string.Equals(invoice.status, "Refunded", StringComparison.OrdinalIgnoreCase))
                {
                    await db.RollbackTransaction();
                    return new InvoiceRefundRes { errorMessage = "Already refunded" };
                }

                if (invoice.customerId > 0)
                {
                    await loyaltyTransactionService.ReverseForInvoiceTransaction(db, new LoyaltyReversalReq
                    {
                        orgId = invoice.orgId,
                        locationId = invoice.locationId,
                        customerId = invoice.customerId,
                        invoiceId = invoice.id,
                        reason = req.reason,
                    });
                }

                invoice.status = "Refunded";
                await UpdateTransaction(db, invoice);
                await db.CommitTransaction();
                return new InvoiceRefundRes { success = true };
            }
            catch (Exception ex)
            {
                await db.RollbackTransaction();
                return new InvoiceRefundRes { errorMessage = ex.Message };
            }
        }

        private async Task<InvoiceQuoteRes> QuoteTransaction(IDb db, InvoiceQuoteReq req)
        {
            var res = new InvoiceQuoteRes();
            if (req.lines == null || req.lines.Count == 0)
            {
                res.errorMessage = "Add at least one line item";
                return res;
            }

            var customers = await customerService.SelectTransaction(db, new CustomerSelectReq { id = req.customerId, orgId = req.orgId });
            var customer = customers.FirstOrDefault();
            if (customer == null)
            {
                res.errorMessage = "Customer not found";
                return res;
            }
            res.customerPoints = customer.points;

            var orgRows = await organizationService.SelectTransaction(db, new OrganizationSelectReq { orgId = req.orgId });
            var org = orgRows.FirstOrDefault();
            var loyaltyPrograms = await loyaltyService.SelectTransaction(db, new LoyaltySelectReq { orgId = req.orgId });
            var rule = ResolveLoyaltyRule(loyaltyPrograms, org, req.locationId > 0 ? req.locationId : customer.locationId, customer.tier);
            res.programId = rule.programId;
            res.expiryMonths = rule.expiryMonths;

            decimal membershipDiscount = 0;
            if (customer.membershipId > 0)
            {
                var memberships = await membershipService.SelectTransaction(db, new MembershipSelectReq { orgId = req.orgId });
                var mem = memberships.FirstOrDefault(m => m.id == customer.membershipId);
                if (mem != null && string.Equals(mem.status, "Active", StringComparison.OrdinalIgnoreCase))
                {
                    var plans = await membershipPlanService.SelectTransaction(db, new MembershipPlanSelectReq { orgId = req.orgId });
                    var plan = plans.FirstOrDefault(p => p.id == mem.planId) ?? plans.FirstOrDefault(p => p.name == mem.plan);
                    var extraPct = plan?.extraDiscountPct ?? 0;
                    if (extraPct > 0)
                        membershipDiscount = Math.Round(req.lines.Sum(l => l.price * l.qty) * (extraPct / 100m), 0);
                }
            }

            res.subtotal = req.lines.Sum(l => l.price * l.qty);
            res.otherDiscount = Math.Max(0, req.discount);
            res.membershipDiscount = membershipDiscount;

            decimal afterMember = Math.Max(0, res.subtotal - res.membershipDiscount - res.otherDiscount);

            decimal rewardTotal = 0;
            if (req.rewards?.wheelSpinId > 0)
            {
                var spins = await wheelSpinService.SelectTransaction(db, new WheelSpinSelectReq { id = req.rewards.wheelSpinId });
                var spin = spins.FirstOrDefault();
                if (spin != null && string.Equals(spin.status, "Pending", StringComparison.OrdinalIgnoreCase))
                {
                    var amount = Math.Min(wheelSpinService.WheelSpinDiscountAmount(spin, afterMember), afterMember);
                    if (amount > 0)
                    {
                        res.rewardLines.Add(new InvoiceDiscountLine { label = $"Wheel · {spin.label}", amount = amount });
                        rewardTotal += amount;
                    }
                }
            }
            res.rewardDiscount = rewardTotal;

            decimal afterRewards = Math.Max(0, afterMember - rewardTotal);
            res.couponDiscount = await ComputeCouponDiscount(db, req, afterRewards);
            decimal afterCoupons = Math.Max(0, afterRewards - res.couponDiscount);

            long maxPts = rule.rupeesPerPoint > 0 ? (long)Math.Floor((double)(afterCoupons / rule.rupeesPerPoint)) : 0;
            res.pointsRedeemApplied = Math.Max(0, Math.Min(Math.Min(req.pointsRedeemed, customer.points), maxPts));
            res.loyaltyValue = res.pointsRedeemApplied * rule.rupeesPerPoint;
            res.rupeesPerPoint = rule.rupeesPerPoint;

            var totals = BillTotals(req.lines, res.otherDiscount, res.membershipDiscount, res.rewardDiscount + res.couponDiscount, res.loyaltyValue);
            res.taxable = totals.taxable;
            res.tax = totals.tax;
            res.total = totals.total;
            res.pointsToEarn = EarnPoints(totals.taxable, rule);
            return res;
        }

        private async Task<decimal> ComputeCouponDiscount(IDb db, InvoiceQuoteReq req, decimal eligibleSubtotal)
        {
            if (req.couponCodes == null || req.couponCodes.Count == 0 || eligibleSubtotal <= 0) return 0;
            decimal total = 0;
            foreach (var code in req.couponCodes.Where(c => !string.IsNullOrWhiteSpace(c)))
            {
                var coupons = await couponService.SelectTransaction(db, new CouponSelectReq { orgId = req.orgId, search = code.Trim() });
                var coupon = coupons.FirstOrDefault(c => string.Equals(c.code, code.Trim(), StringComparison.OrdinalIgnoreCase));
                if (coupon == null) continue;
                if (coupon.minBillAmount > 0 && eligibleSubtotal < coupon.minBillAmount) continue;
                decimal amount = 0;
                if (string.Equals(coupon.discountType, "percentage", StringComparison.OrdinalIgnoreCase))
                    amount = Math.Round(eligibleSubtotal * (coupon.discountValue / 100m), 0);
                else if (string.Equals(coupon.discountType, "flat", StringComparison.OrdinalIgnoreCase))
                    amount = coupon.discountValue;
                if (coupon.maxDiscount > 0) amount = Math.Min(amount, coupon.maxDiscount);
                total += Math.Min(amount, eligibleSubtotal);
            }
            return total;
        }

        private static (decimal taxable, decimal tax, decimal total) BillTotals(
            List<InvoiceBillLine> lines,
            decimal otherDiscount,
            decimal membershipDiscount,
            decimal rewardDiscount,
            decimal loyaltyValue)
        {
            var subtotal = lines.Sum(l => l.price * l.qty);
            var deductions = Math.Min(otherDiscount + membershipDiscount + rewardDiscount + loyaltyValue, subtotal);
            var taxable = Math.Max(subtotal - deductions, 0);
            decimal tax = 0;
            foreach (var line in lines)
            {
                var share = subtotal > 0 ? (line.price * line.qty) / subtotal : 0;
                tax += taxable * share * (line.gstRate / 100m);
            }
            return (taxable, Math.Round(tax, 0), Math.Round(taxable + tax, 0));
        }

        private sealed class LoyaltyRuleCtx
        {
            public long programId { get; set; }
            public decimal earnUnitRupees { get; set; } = 100;
            public decimal pointsPerUnit { get; set; } = 1;
            public decimal rupeesPerPoint { get; set; } = 1;
            public decimal minSpend { get; set; }
            public long expiryMonths { get; set; } = 12;
        }

        private static int ScoreLoyaltyProgram(Loyalty program, long locationId, string tier)
        {
            var score = 0;
            if (locationId > 0 && program.locationId == locationId) score += 2;
            var programTier = program.tier ?? "All";
            if (!string.Equals(programTier, "All", StringComparison.OrdinalIgnoreCase)
                && string.Equals(programTier, tier ?? "", StringComparison.OrdinalIgnoreCase))
                score += 1;
            return score;
        }

        private static LoyaltyRuleCtx ResolveLoyaltyRule(List<Loyalty> programs, Organization? org, long locationId, string tier)
        {
            var active = programs.Where(p => string.Equals(p.type, "Points", StringComparison.OrdinalIgnoreCase)
                && string.Equals(p.status, "Active", StringComparison.OrdinalIgnoreCase)).ToList();
            var program = active
                .OrderByDescending(p => ScoreLoyaltyProgram(p, locationId, tier))
                .ThenByDescending(p => p.id)
                .FirstOrDefault();
            if (program != null)
            {
                return new LoyaltyRuleCtx
                {
                    programId = program.id,
                    earnUnitRupees = program.earnUnitRupees > 0 ? program.earnUnitRupees : 100,
                    pointsPerUnit = program.pointsPerUnit > 0 ? program.pointsPerUnit : 1,
                    rupeesPerPoint = program.rupeesPerPoint > 0 ? program.rupeesPerPoint : 1,
                    minSpend = program.minSpend,
                    expiryMonths = program.expiryMonths > 0 ? program.expiryMonths : 12,
                };
            }
            return new LoyaltyRuleCtx
            {
                earnUnitRupees = org?.earnUnitRupees > 0 ? org.earnUnitRupees : 100,
                pointsPerUnit = org?.pointsPerUnit > 0 ? org.pointsPerUnit : 1,
                rupeesPerPoint = org?.rupeesPerPoint > 0 ? org.rupeesPerPoint : 1,
                minSpend = org?.loyaltyMinSpend ?? 0,
                expiryMonths = 12,
            };
        }

        private static long EarnPoints(decimal eligibleSpend, LoyaltyRuleCtx rule)
        {
            if (eligibleSpend < rule.minSpend || rule.earnUnitRupees <= 0 || rule.pointsPerUnit <= 0) return 0;
            var units = Math.Floor(eligibleSpend / rule.earnUnitRupees);
            return (long)Math.Max(0, units * rule.pointsPerUnit);
        }

        private static Invoice Map(DbDataReader reader)
        {
            return new Invoice
            {
                id = ReadLong(reader, "id"),
                orgId = ReadLong(reader, "orgId"),
                locationId = ReadLong(reader, "locationId"),
                customer = reader["customer"]?.ToString() ?? "",
                outlet = reader["outlet"]?.ToString() ?? "",
                date = ReadDate(reader, "date"),
                items = reader["items"]?.ToString() ?? "",
                subtotal = ReadDecimal(reader, "subtotal"),
                discount = ReadDecimal(reader, "discount"),
                gstRate = ReadDecimal(reader, "gstRate"),
                tax = ReadDecimal(reader, "tax"),
                total = ReadDecimal(reader, "total"),
                payment = reader["payment"]?.ToString() ?? "",
                status = reader["status"]?.ToString() ?? "",
                createdby = reader["createdby"]?.ToString() ?? "",
                createdon = ReadDate(reader, "createdon"),
                updatedby = reader["updatedby"]?.ToString() ?? "",
                updatedon = ReadDate(reader, "updatedon"),
                customerId = ReadLong(reader, "customerId"),
                membershipId = ReadLong(reader, "membershipId"),
            };
        }

        private static void Bind(DbCommand cmd, IDb db, Invoice entity, bool includeId)
        {
            if (includeId)
                db.AddParameter(cmd, "id", DbTypes.Types.Long).Value = entity.id;
            db.AddParameter(cmd, "orgId", DbTypes.Types.Long).Value = entity.orgId;
            db.AddParameter(cmd, "locationId", DbTypes.Types.Long).Value = entity.locationId;
            db.AddParameter(cmd, "customer", DbTypes.Types.String).Value = entity.customer ?? "";
            db.AddParameter(cmd, "outlet", DbTypes.Types.String).Value = entity.outlet ?? "";
            db.AddParameter(cmd, "date", DbTypes.Types.Date).Value = entity.date ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "items", DbTypes.Types.String).Value = entity.items ?? "";
            db.AddParameter(cmd, "subtotal", DbTypes.Types.Decimal).Value = entity.subtotal;
            db.AddParameter(cmd, "discount", DbTypes.Types.Decimal).Value = entity.discount;
            db.AddParameter(cmd, "gstRate", DbTypes.Types.Decimal).Value = entity.gstRate;
            db.AddParameter(cmd, "tax", DbTypes.Types.Decimal).Value = entity.tax;
            db.AddParameter(cmd, "total", DbTypes.Types.Decimal).Value = entity.total;
            db.AddParameter(cmd, "payment", DbTypes.Types.String).Value = entity.payment ?? "";
            db.AddParameter(cmd, "status", DbTypes.Types.String).Value = entity.status ?? "";
            db.AddParameter(cmd, "createdby", DbTypes.Types.String).Value = entity.createdby ?? "";
            db.AddParameter(cmd, "createdon", DbTypes.Types.Date).Value = entity.createdon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "updatedby", DbTypes.Types.String).Value = entity.updatedby ?? "";
            db.AddParameter(cmd, "updatedon", DbTypes.Types.Date).Value = entity.updatedon ?? DateTime.UtcNow.Date;
            db.AddParameter(cmd, "customerId", DbTypes.Types.Long).Value = entity.customerId;
            db.AddParameter(cmd, "membershipId", DbTypes.Types.Long).Value = entity.membershipId;
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
