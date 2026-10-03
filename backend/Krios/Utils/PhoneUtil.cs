namespace Krios.Utils
{
    public static class PhoneUtil
    {
        public static string Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            var digits = new string(value.Where(char.IsDigit).ToArray());
            if (digits.Length >= 10) return digits[^10..];
            return digits;
        }

        public static string Mask(string? value)
        {
            var n = Normalize(value);
            if (n.Length < 4) return "****";
            return $"******{n[^4..]}";
        }
    }
}
