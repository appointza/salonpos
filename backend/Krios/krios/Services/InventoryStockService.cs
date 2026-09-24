using Krios.Models.Krios;
using Krios.Utils;

namespace Krios.Services.Krios
{
    public class InventoryStockService
    {
        private static readonly HashSet<string> OutboundTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "Sale", "Used", "Wastage",
        };

        private readonly IDbProvider dbprovider;
        private readonly InventoryService inventoryService;
        private readonly StockMovementService stockMovementService;
        private readonly ServiceService serviceService;
        private readonly ServiceProductService serviceProductService;

        public InventoryStockService(
            IDbProvider dbprovider,
            InventoryService inventoryService,
            StockMovementService stockMovementService,
            ServiceService serviceService,
            ServiceProductService serviceProductService)
        {
            this.dbprovider = dbprovider;
            this.inventoryService = inventoryService;
            this.stockMovementService = stockMovementService;
            this.serviceService = serviceService;
            this.serviceProductService = serviceProductService;
        }

        public async Task<InventoryRemainingRes> GetRemaining(InventoryRemainingReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await GetRemainingTransaction(db, req);
        }

        public async Task<InventoryRemainingRes> GetRemainingTransaction(IDb db, InventoryRemainingReq req)
        {
            var res = new InventoryRemainingRes();
            if (req.orgId <= 0)
            {
                res.errorMessage = "orgId is required";
                return res;
            }

            var skus = await inventoryService.SelectTransaction(db, new InventorySelectReq { orgId = req.orgId, id = req.skuId });
            var movements = await stockMovementService.SelectTransaction(db, new StockMovementSelectReq { orgId = req.orgId });

            foreach (var sku in skus)
            {
                var remaining = RemainingFor(sku.id, movements, req.locationId, sku);
                res.rows.Add(new InventoryRemainingRow { skuId = sku.id, remaining = remaining });
            }

            return res;
        }

        public async Task<InventoryCheckAvailabilityRes> CheckAvailability(InventoryCheckAvailabilityReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            return await CheckAvailabilityTransaction(db, req);
        }

        public async Task<InventoryCheckAvailabilityRes> CheckAvailabilityTransaction(IDb db, InventoryCheckAvailabilityReq req)
        {
            var res = new InventoryCheckAvailabilityRes { ok = true };
            if (req.orgId <= 0)
            {
                res.ok = false;
                res.errorMessage = "orgId is required";
                return res;
            }

            var skus = await inventoryService.SelectTransaction(db, new InventorySelectReq { orgId = req.orgId });
            var movements = await stockMovementService.SelectTransaction(db, new StockMovementSelectReq { orgId = req.orgId });
            var services = await serviceService.SelectTransaction(db, new ServiceSelectReq { orgId = req.orgId });
            var recipes = await serviceProductService.SelectTransaction(db, new ServiceProductSelectReq { orgId = req.orgId });

            res.missing = BuildMissingList(req.lines, skus, movements, services, recipes, req.locationId);
            var expiredMsg = BuildExpiredMessage(req.lines, skus, services, recipes);
            if (!string.IsNullOrWhiteSpace(expiredMsg))
            {
                res.ok = false;
                res.errorMessage = expiredMsg;
                return res;
            }

            if (res.missing.Count > 0)
            {
                res.ok = false;
                res.errorMessage = string.Join(" ", res.missing.Select(m =>
                    $"{m.name} is missing. Need {m.need}, have {m.have}."));
            }

            return res;
        }

        public async Task<StockAdjustRes> Adjust(StockAdjustReq req)
        {
            using IDb db = await dbprovider.GetDb();
            await db.Connect();
            await db.BeginTransaction();
            try
            {
                var result = await AdjustTransaction(db, req);
                if (!result.ok)
                {
                    await db.RollbackTransaction();
                    return result;
                }
                await db.CommitTransaction();
                return result;
            }
            catch (Exception ex)
            {
                await db.RollbackTransaction();
                return new StockAdjustRes { ok = false, errorMessage = ex.Message };
            }
        }

        public async Task<StockAdjustRes> AdjustTransaction(IDb db, StockAdjustReq req)
        {
            if (req.orgId <= 0 || req.skuId <= 0 || req.quantity <= 0)
                return new StockAdjustRes { ok = false, errorMessage = "Invalid org, SKU, or quantity" };

            var skus = await inventoryService.SelectTransaction(db, new InventorySelectReq { orgId = req.orgId, id = req.skuId });
            var sku = skus.FirstOrDefault();
            if (sku == null)
                return new StockAdjustRes { ok = false, errorMessage = "SKU not found" };

            var loc = ResolveLocation(req.locationId, sku);
            var movements = await stockMovementService.SelectTransaction(db, new StockMovementSelectReq { orgId = req.orgId });
            var before = RemainingFor(req.skuId, movements, loc, sku);
            var outbound = string.Equals(req.direction, "out", StringComparison.OrdinalIgnoreCase);
            var qty = Math.Abs(req.quantity);

            if (outbound && qty > before)
                return new StockAdjustRes { ok = false, errorMessage = $"Cannot adjust out {qty} — only {before} on hand." };

            var posted = await PostMovementTransaction(db, new PostMovementArgs
            {
                orgId = req.orgId,
                locationId = loc,
                sku = sku,
                type = "Adjustment",
                quantity = qty,
                outbound = outbound,
                reason = string.IsNullOrWhiteSpace(req.reason) ? "Adjustment" : req.reason,
                date = req.date ?? DateTime.UtcNow.Date,
                balanceBefore = before,
            });

            if (!posted.ok)
                return new StockAdjustRes { ok = false, errorMessage = posted.errorMessage };

            return new StockAdjustRes
            {
                ok = true,
                movement = posted.movement!,
                remainingAfter = posted.remainingAfter,
            };
        }

        public async Task<(bool ok, string errorMessage)> ValidateForSaleTransaction(
            IDb db,
            long orgId,
            long locationId,
            List<InventoryAvailabilityLine> lines)
        {
            var check = await CheckAvailabilityTransaction(db, new InventoryCheckAvailabilityReq
            {
                orgId = orgId,
                locationId = locationId,
                lines = lines,
            });
            return (check.ok, check.errorMessage);
        }

        public async Task IssueForSaleTransaction(IDb db, InventoryIssueForSaleReq req)
        {
            var skus = await inventoryService.SelectTransaction(db, new InventorySelectReq { orgId = req.orgId });
            var movements = await stockMovementService.SelectTransaction(db, new StockMovementSelectReq { orgId = req.orgId });
            var services = await serviceService.SelectTransaction(db, new ServiceSelectReq { orgId = req.orgId });
            var recipes = await serviceProductService.SelectTransaction(db, new ServiceProductSelectReq { orgId = req.orgId });
            var loc = req.locationId;
            var running = new Dictionary<long, decimal>();
            var saleDate = req.date ?? DateTime.UtcNow.Date;

            decimal BalanceOf(long skuId)
            {
                if (running.TryGetValue(skuId, out var v)) return v;
                var sku = skus.FirstOrDefault(s => s.id == skuId);
                return RemainingFor(skuId, movements, loc, sku);
            }

            foreach (var line in req.lines.Where(l => string.Equals(l.kind, "product", StringComparison.OrdinalIgnoreCase)))
            {
                var sku = skus.FirstOrDefault(s => s.id == line.id);
                if (sku == null) continue;
                var before = BalanceOf(line.id);
                var type = sku.sellPrice > 0 ? "Sale" : "Used";
                var posted = await PostMovementTransaction(db, new PostMovementArgs
                {
                    orgId = req.orgId,
                    locationId = ResolveLocation(loc, sku),
                    sku = sku,
                    type = type,
                    quantity = line.qty,
                    outbound = true,
                    customerId = req.customerId,
                    invoiceId = req.invoiceId,
                    reason = type == "Sale" ? "POS sale to customer" : "Used on customer",
                    date = saleDate,
                    balanceBefore = before,
                });
                if (posted.ok)
                {
                    running[line.id] = before - line.qty;
                    movements.Add(posted.movement!);
                }
            }

            foreach (var pair in RecipeDemand(req.lines, services, recipes))
            {
                var skuId = pair.Key;
                var qty = pair.Value;
                if (qty <= 0) continue;
                var sku = skus.FirstOrDefault(s => s.id == skuId);
                if (sku == null) continue;
                var before = BalanceOf(skuId);
                var posted = await PostMovementTransaction(db, new PostMovementArgs
                {
                    orgId = req.orgId,
                    locationId = ResolveLocation(loc, sku),
                    sku = sku,
                    type = "Used",
                    quantity = qty,
                    outbound = true,
                    customerId = req.customerId,
                    invoiceId = req.invoiceId,
                    reason = "Used for service",
                    date = saleDate,
                    balanceBefore = before,
                });
                if (posted.ok)
                {
                    running[skuId] = before - qty;
                    movements.Add(posted.movement!);
                }
            }
        }

        private static long ResolveLocation(long locationId, Inventory sku)
        {
            if (locationId > 0) return locationId;
            return sku.locationId;
        }

        private static long MovementSkuKey(StockMovement m)
        {
            return m.skuId > 0 ? m.skuId : long.TryParse(m.sku, out var parsed) ? parsed : 0;
        }

        private static decimal SignedQty(StockMovement row)
        {
            var type = row.type ?? "";
            var q = Math.Abs(row.quantity);
            if (q > 0)
            {
                if (OutboundTypes.Contains(type)) return -q;
                if (string.Equals(type, "Adjustment", StringComparison.OrdinalIgnoreCase))
                {
                    if (row.qtyOut > 0) return -q;
                    if (row.qtyIn > 0) return q;
                }
                return q;
            }
            return row.qtyIn - row.qtyOut;
        }

        public static decimal RemainingFor(long skuId, List<StockMovement> movements, long locationId, Inventory? sku)
        {
            IEnumerable<StockMovement> scoped = movements;
            if (locationId > 0)
            {
                scoped = movements.Where(m =>
                {
                    var mLoc = m.locationId;
                    return mLoc <= 0 || mLoc == locationId;
                });
            }

            var matched = scoped.Where(m => MovementSkuKey(m) == skuId).ToList();
            var fromMovements = Math.Max(0, matched.Sum(SignedQty));
            if (matched.Count > 0) return fromMovements;

            if (sku == null) return fromMovements;
            if (locationId > 0 && sku.locationId > 0 && sku.locationId != locationId)
                return fromMovements;

            return Math.Max(fromMovements, sku.stock);
        }

        private static bool IsSkuExpired(Inventory sku, DateTime at)
        {
            if (sku.expiry == null) return false;
            return sku.expiry.Value.Date < at.Date;
        }

        private static List<(long skuId, decimal qty)> ParseProductNeeds(string value)
        {
            var outList = new List<(long, decimal)>();
            foreach (var part in (value ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var token = part.Trim();
                if (string.IsNullOrWhiteSpace(token)) continue;
                var bits = token.Split(':');
                if (!long.TryParse(bits[0].Trim(), out var skuId) || skuId <= 0) continue;
                var qty = bits.Length > 1 && decimal.TryParse(bits[1].Trim(), out var parsed) ? Math.Max(1, parsed) : 1;
                outList.Add((skuId, qty));
            }
            return outList;
        }

        private static List<long> ComboServiceIds(Service? service)
        {
            if (service == null) return new List<long>();
            if (!string.Equals(service.type, "Combo", StringComparison.OrdinalIgnoreCase))
                return new List<long> { service.id };

            var ids = (service.comboItems ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => long.TryParse(s.Trim(), out var id) ? id : 0)
                .Where(id => id > 0)
                .ToList();
            return ids.Count > 0 ? ids : new List<long> { service.id };
        }

        private static List<(long skuId, decimal qty)> RecipesForService(
            long serviceId,
            List<Service> services,
            List<ServiceProduct> recipes)
        {
            var service = services.FirstOrDefault(s => s.id == serviceId);
            var ids = ComboServiceIds(service);
            var merged = new Dictionary<long, decimal>();

            foreach (var id in ids)
            {
                var svc = services.FirstOrDefault(s => s.id == id);
                var fromTable = recipes.Where(r => r.serviceId == id).ToList();
                var rows = fromTable.Count > 0
                    ? fromTable.Select(r => (skuId: r.skuId > 0 ? r.skuId : long.TryParse(r.sku, out var p) ? p : 0L, qty: Math.Max(1m, r.quantity)))
                    : ParseProductNeeds(svc?.productNeeds ?? "");

                foreach (var row in rows)
                {
                    if (row.skuId <= 0) continue;
                    merged[row.skuId] = merged.GetValueOrDefault(row.skuId) + row.qty;
                }
            }

            return merged.Select(kv => (kv.Key, kv.Value)).ToList();
        }

        private static Dictionary<long, decimal> RecipeDemand(
            List<InventoryAvailabilityLine> lines,
            List<Service> services,
            List<ServiceProduct> recipes)
        {
            var demand = new Dictionary<long, decimal>();
            foreach (var line in lines.Where(l => string.Equals(l.kind, "service", StringComparison.OrdinalIgnoreCase)))
            {
                foreach (var need in RecipesForService(line.id, services, recipes))
                {
                    demand[need.skuId] = demand.GetValueOrDefault(need.skuId) + need.qty * line.qty;
                }
            }
            return demand;
        }

        private static List<InventoryMissingProduct> BuildMissingList(
            List<InventoryAvailabilityLine> lines,
            List<Inventory> skus,
            List<StockMovement> movements,
            List<Service> services,
            List<ServiceProduct> recipes,
            long locationId)
        {
            var reserved = new Dictionary<long, decimal>();
            var missing = new List<InventoryMissingProduct>();

            void Consider(long skuId, decimal qty)
            {
                var sku = skus.FirstOrDefault(s => s.id == skuId);
                var have = RemainingFor(skuId, movements, locationId, sku) - reserved.GetValueOrDefault(skuId);
                if (qty > have)
                {
                    missing.Add(new InventoryMissingProduct
                    {
                        skuId = skuId,
                        name = sku?.name ?? skuId.ToString(),
                        need = qty,
                        have = Math.Max(0, have),
                    });
                }
                reserved[skuId] = reserved.GetValueOrDefault(skuId) + qty;
            }

            foreach (var line in lines.Where(l => string.Equals(l.kind, "product", StringComparison.OrdinalIgnoreCase)))
                Consider(line.id, line.qty);

            foreach (var pair in RecipeDemand(lines, services, recipes))
                Consider(pair.Key, pair.Value);

            return missing;
        }

        private static string BuildExpiredMessage(
            List<InventoryAvailabilityLine> lines,
            List<Inventory> skus,
            List<Service> services,
            List<ServiceProduct> recipes)
        {
            var at = DateTime.UtcNow.Date;
            var msgs = new List<string>();

            foreach (var sku in skus.Where(s => IsSkuExpired(s, at)))
            {
                var id = sku.id;
                var productQty = lines
                    .Where(l => string.Equals(l.kind, "product", StringComparison.OrdinalIgnoreCase) && l.id == id)
                    .Sum(l => (decimal)l.qty);
                var recipeQty = RecipeDemand(lines, services, recipes).GetValueOrDefault(id);
                if (productQty + recipeQty > 0)
                    msgs.Add($"{sku.name} is expired ({sku.expiry:yyyy-MM-dd}).");
            }

            return string.Join(" ", msgs);
        }

        private class PostMovementArgs
        {
            public long orgId { get; set; }
            public long locationId { get; set; }
            public Inventory sku { get; set; } = new();
            public string type { get; set; } = "";
            public decimal quantity { get; set; }
            public bool outbound { get; set; }
            public long customerId { get; set; }
            public long invoiceId { get; set; }
            public long expenseId { get; set; }
            public string reason { get; set; } = "";
            public DateTime date { get; set; }
            public decimal balanceBefore { get; set; }
        }

        private async Task<(bool ok, string errorMessage, StockMovement? movement, decimal remainingAfter)> PostMovementTransaction(
            IDb db,
            PostMovementArgs input)
        {
            var qty = Math.Abs(input.quantity);
            if (qty <= 0)
                return (false, "Invalid quantity", null, 0);

            if (input.outbound && (string.Equals(input.type, "Sale", StringComparison.OrdinalIgnoreCase)
                || string.Equals(input.type, "Used", StringComparison.OrdinalIgnoreCase)
                || string.Equals(input.type, "Wastage", StringComparison.OrdinalIgnoreCase))
                && IsSkuExpired(input.sku, input.date))
            {
                return (false, $"{input.sku.name} batch {input.sku.batch} expired on {input.sku.expiry:yyyy-MM-dd}", null, 0);
            }

            var before = input.balanceBefore;
            var after = before + (input.outbound ? -qty : qty);
            if (input.outbound && qty > before)
                return (false, $"{input.sku.name} is short. Need {qty}, have {Math.Max(0, before)}.", null, 0);

            var movement = new StockMovement
            {
                orgId = input.orgId,
                locationId = input.locationId,
                sku = input.sku.id.ToString(),
                skuId = input.sku.id,
                skuName = input.sku.name,
                customerId = input.customerId,
                invoiceId = input.invoiceId,
                expenseId = input.expenseId,
                type = input.type,
                quantity = qty,
                qtyIn = input.outbound ? 0 : qty,
                qtyOut = input.outbound ? qty : 0,
                date = input.date,
                balanceBefore = before,
                balanceAfter = Math.Max(0, after),
                reason = input.reason,
                status = "Posted",
            };

            await stockMovementService.InsertTransaction(db, movement);

            input.sku.stock = (long)Math.Max(0, after);
            await inventoryService.UpdateTransaction(db, input.sku);

            return (true, "", movement, Math.Max(0, after));
        }
    }
}
