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
            IEnumerable<(long Id, string Name, decimal Price, long Qty)> lines)
        {
            if (string.Equals(rewardType, "Flat discount", StringComparison.OrdinalIgnoreCase))
                return Math.Min(rewardValue, subtotal);
            if (string.Equals(rewardType, "Percentage discount", StringComparison.OrdinalIgnoreCase))
                return Math.Round(subtotal * (rewardValue / 100m), 0);
            if (string.Equals(rewardType, "Free service", StringComparison.OrdinalIgnoreCase)
                || string.Equals(rewardType, "Free item", StringComparison.OrdinalIgnoreCase))
            {
                if (rewardValue <= 0) return 0;
                var line = (lines ?? Enumerable.Empty<(long Id, string Name, decimal Price, long Qty)>())
                    .FirstOrDefault(l => l.Id == rewardValue);
                if (line.Id != rewardValue) return 0;
                return Math.Round(line.Price * line.Qty, 0);
            }
            return 0;
        }
    }
}
