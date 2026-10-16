using System;
using System.Collections.Generic;
using System.Linq;

namespace Krios.Utils
{
    public static class PrizeDiscount
    {
        public static decimal Amount(
            string rewardType,
            long rewardValue,
            string label,
            decimal subtotal,
            IEnumerable<(long Id, string Name, decimal Price, long Qty)> lines,
            long serviceId = 0)
        {
            var cart = (lines ?? Enumerable.Empty<(long Id, string Name, decimal Price, long Qty)>()).ToList();
            var scopedId = serviceId > 0 ? serviceId : 0;
            var serviceBase = scopedId > 0
                ? cart.Where(l => l.Id == scopedId).Sum(l => l.Price * l.Qty)
                : 0m;

            if (string.Equals(rewardType, "Flat discount", StringComparison.OrdinalIgnoreCase))
            {
                var cap = scopedId > 0 ? serviceBase : subtotal;
                return Math.Min(rewardValue, cap);
            }
            if (string.Equals(rewardType, "Percentage discount", StringComparison.OrdinalIgnoreCase))
            {
                var basis = scopedId > 0 ? serviceBase : subtotal;
                return Math.Round(basis * (rewardValue / 100m), 0);
            }
            if (string.Equals(rewardType, "Free service", StringComparison.OrdinalIgnoreCase)
                || string.Equals(rewardType, "Free item", StringComparison.OrdinalIgnoreCase))
            {
                var id = scopedId > 0 ? scopedId : rewardValue;
                if (id <= 0) return 0;
                var line = cart.FirstOrDefault(l => l.Id == id);
                if (line.Id != id) return 0;
                return Math.Round(line.Price * line.Qty, 0);
            }
            return 0;
        }
    }
}
